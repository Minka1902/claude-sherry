import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { tokenPrice } from "@/lib/credits";
import { countTokens } from "@/lib/tokenizer";
import * as github from "@/lib/github";
import { acceptOrder, answerPrompt, cancelOrder, createOrder, declineOrder, endSession, settleAllExpired, submitPrompt } from "@/lib/orders";
import { createReview } from "@/lib/reviews";

vi.mock("@/lib/github", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/github")>();
  return {
    ...actual,
    verifyRepo: vi.fn(async () => {}),
    getBranchSha: vi.fn(async () => "sha0"),
    createBranch: vi.fn(async () => {}),
    inviteCollaborator: vi.fn(async () => 42),
    revokeAccess: vi.fn(async () => {}),
    compare: vi.fn(),
    openPullRequest: vi.fn(async () => 7),
  };
});

const gh = vi.mocked(github);
const RATE = 150;
const ADDED = "export function hello() {\n  return 'world';\n}";
const ADDED_TOKENS = countTokens(ADDED);
const diffOf = (code: string) => `diff --git a/x.ts b/x.ts\n--- a/x.ts\n+++ b/x.ts\n@@ -0,0 +1 @@\n${code.split("\n").map((l) => `+${l}`).join("\n")}`;

let buyerId: string;
let sellerId: string;

async function makeUser(login: string, balance: number) {
  const user = await prisma.user.create({ data: { name: login, githubLogin: login, balance } });
  await prisma.account.create({ data: { userId: user.id, type: "oauth", provider: "github", providerAccountId: login, access_token: encrypt(`token-${login}`) } });
  return user.id;
}

async function balances() {
  const [b, s] = await Promise.all([buyerId, sellerId].map((id) => prisma.user.findUniqueOrThrow({ where: { id }, select: { balance: true, withdrawable: true } })));
  return { buyer: b.balance, seller: s.balance, sellerWithdrawable: s.withdrawable };
}

const buy = (type: "PROMPT" | "SESSION", maxTokens = 20_000) =>
  createOrder({ buyerId, sellerId, type, repoOwner: "acme", repoName: "app", baseBranch: "main", prompt: "Add hello()", maxTokens });

async function buyAndAccept(type: "PROMPT" | "SESSION", maxTokens?: number) {
  const order = await buy(type, maxTokens);
  await acceptOrder(order.id, sellerId);
  return order;
}

function pushed(code: string, head = "sha1", base = "sha0") {
  gh.getBranchSha.mockResolvedValueOnce(head);
  gh.compare.mockResolvedValueOnce({ status: "ahead", aheadBy: 1, diff: diffOf(code), uncountedFiles: [] });
  return base;
}

beforeEach(async () => {
  vi.clearAllMocks();
  gh.getBranchSha.mockResolvedValue("sha0");
  await prisma.$executeRawUnsafe(`TRUNCATE "LedgerEntry", "Review", "Prompt", "Order", "SellerProfile", "Account", "User" CASCADE`);
  buyerId = await makeUser("buyer", 10_000);
  sellerId = await makeUser("seller", 0);
  await prisma.sellerProfile.create({ data: { userId: sellerId, ratePer10k: RATE, sessionPrice: 3000, sessionMinutes: 60, sessionTokenCap: 50 } });
});

describe("buying", () => {
  it("holds max tokens × rate for a prompt", async () => {
    const order = await buy("PROMPT", 20_000);
    expect(order.held).toBe(tokenPrice(20_000, RATE));
    expect((await balances()).buyer).toBe(10_000 - order.held);
    expect(await prisma.ledgerEntry.count({ where: { userId: buyerId, kind: "HOLD", amount: -order.held } })).toBe(1);
  });

  it("rejects when credits are short", async () => {
    await prisma.user.update({ where: { id: buyerId }, data: { balance: 10 } });
    await expect(buy("SESSION")).rejects.toThrow("Not enough credits");
    expect(await prisma.order.count()).toBe(0);
  });

  it("never double-spends under concurrent purchases", async () => {
    await prisma.user.update({ where: { id: buyerId }, data: { balance: 3000 } });
    const results = await Promise.allSettled([buy("SESSION"), buy("SESSION"), buy("SESSION")]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await balances()).buyer).toBe(0);
    expect(await prisma.order.count()).toBe(1);
  });

  it("refunds on decline and on cancel", async () => {
    const a = await buy("SESSION");
    await declineOrder(a.id, sellerId);
    const b = await buy("PROMPT");
    await cancelOrder(b.id, buyerId);
    expect((await balances()).buyer).toBe(10_000);
    await expect(cancelOrder(b.id, buyerId)).rejects.toThrow();
    expect((await balances()).buyer).toBe(10_000);
  });
});

describe("accept", () => {
  it("creates the branch, invites the seller and stamps fromSha", async () => {
    const order = await buyAndAccept("PROMPT");
    expect(gh.createBranch).toHaveBeenCalledWith("token-buyer", "acme", "app", `sherry/order-${order.id}`, "sha0");
    expect(gh.inviteCollaborator).toHaveBeenCalledWith("token-buyer", "acme", "app", "seller");
    const saved = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { prompts: true } });
    expect(saved).toMatchObject({ status: "ACTIVE", lastSha: "sha0", inviteId: 42 });
    expect(saved.prompts[0].fromSha).toBe("sha0");
  });
});

describe("prompt delivery", () => {
  it("pays the seller for diff tokens and refunds the rest", async () => {
    const order = await buyAndAccept("PROMPT", 20_000);
    const [prompt] = await prisma.prompt.findMany({ where: { orderId: order.id } });
    pushed(ADDED);
    const result = await answerPrompt(prompt.id, sellerId, "done");

    const charged = tokenPrice(ADDED_TOKENS, RATE);
    expect(result).toEqual({ tokens: ADDED_TOKENS, closed: true });
    expect(await balances()).toEqual({ buyer: 10_000 - charged, seller: charged, sellerWithdrawable: charged });
    expect(await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({ status: "COMPLETED", charged, lastSha: "sha1", prNumber: 7 });
    expect(await prisma.sellerProfile.findUniqueOrThrow({ where: { userId: sellerId } })).toMatchObject({ answeredCount: 1 });
    expect(gh.revokeAccess).toHaveBeenCalledWith("token-buyer", "acme", "app", "seller", 42);
  });

  it("bills at most the max tokens", async () => {
    const order = await buyAndAccept("PROMPT", 5);
    const [prompt] = await prisma.prompt.findMany({ where: { orderId: order.id } });
    pushed(ADDED.repeat(10));
    await answerPrompt(prompt.id, sellerId, "");
    expect((await balances()).seller).toBe(order.held);
  });

  it("rejects no new commits and rewritten history", async () => {
    const order = await buyAndAccept("PROMPT");
    const [prompt] = await prisma.prompt.findMany({ where: { orderId: order.id } });
    gh.compare.mockResolvedValueOnce({ status: "identical", aheadBy: 0, diff: "", uncountedFiles: [] });
    await expect(answerPrompt(prompt.id, sellerId, "")).rejects.toThrow("No new commits");
    gh.getBranchSha.mockResolvedValueOnce("other");
    gh.compare.mockResolvedValueOnce({ status: "diverged", aheadBy: 1, diff: "", uncountedFiles: [] });
    await expect(answerPrompt(prompt.id, sellerId, "")).rejects.toThrow("force-push");
    expect((await balances()).seller).toBe(0);
  });

  it("pays only once when marked done twice at the same time", async () => {
    const order = await buyAndAccept("PROMPT");
    const [prompt] = await prisma.prompt.findMany({ where: { orderId: order.id } });
    gh.getBranchSha.mockResolvedValue("sha1");
    gh.compare.mockResolvedValue({ status: "ahead", aheadBy: 1, diff: diffOf(ADDED), uncountedFiles: [] });
    const results = await Promise.allSettled([answerPrompt(prompt.id, sellerId, ""), answerPrompt(prompt.id, sellerId, "")]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await balances()).seller).toBe(tokenPrice(ADDED_TOKENS, RATE));
  });
});

describe("sessions", () => {
  it("allows one open prompt at a time and closes at the token cap", async () => {
    const order = await buyAndAccept("SESSION");
    const first = await submitPrompt(order.id, buyerId, "step 1");
    await expect(submitPrompt(order.id, buyerId, "step 2")).rejects.toThrow("Wait for the seller");

    pushed("a", "sha1");
    expect(await answerPrompt(first.id, sellerId, "")).toMatchObject({ closed: false });
    const second = await submitPrompt(order.id, buyerId, "step 2");
    expect(second.fromSha).toBe("sha1");

    pushed(ADDED.repeat(5), "sha2");
    expect(await answerPrompt(second.id, sellerId, "")).toMatchObject({ closed: true });
    expect(await balances()).toMatchObject({ buyer: 10_000 - 3000, seller: 3000 });
  });

  it("accepts only one of two simultaneous prompts", async () => {
    const order = await buyAndAccept("SESSION");
    const results = await Promise.allSettled([submitPrompt(order.id, buyerId, "a"), submitPrompt(order.id, buyerId, "b")]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.prompt.count({ where: { orderId: order.id } })).toBe(1);
  });

  it("refunds an expired session with no deliveries, pays one with deliveries", async () => {
    const empty = await buyAndAccept("SESSION");
    const used = await buyAndAccept("SESSION");
    const p = await submitPrompt(used.id, buyerId, "go");
    pushed("a");
    await answerPrompt(p.id, sellerId, "");

    await prisma.order.updateMany({ data: { endsAt: new Date(Date.now() - 1000) } });
    expect(await settleAllExpired()).toBe(2);
    expect(await settleAllExpired()).toBe(0);
    expect(await balances()).toMatchObject({ buyer: 10_000 - 3000, seller: 3000 });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: empty.id } })).status).toBe("EXPIRED");
  });

  it("buyer can end a session early", async () => {
    const order = await buyAndAccept("SESSION");
    await endSession(order.id, buyerId);
    expect((await balances()).buyer).toBe(10_000);
    await expect(endSession(order.id, buyerId)).rejects.toThrow();
  });
});

describe("reviews", () => {
  it("only after a delivered, closed order, once, and updates averages", async () => {
    const order = await buyAndAccept("PROMPT");
    const [prompt] = await prisma.prompt.findMany({ where: { orderId: order.id } });
    await expect(createReview(order.id, buyerId, 5, 5, "")).rejects.toThrow("after the order is closed");

    pushed(ADDED);
    await answerPrompt(prompt.id, sellerId, "");
    await expect(createReview(order.id, sellerId, 5, 5, "")).rejects.toThrow("Not your order");
    await expect(createReview(order.id, buyerId, 6, 5, "")).rejects.toThrow("Stars");
    await createReview(order.id, buyerId, 5, 2, "fast but rude");
    await expect(createReview(order.id, buyerId, 5, 5, "")).rejects.toThrow("Already reviewed");

    expect(await prisma.sellerProfile.findUniqueOrThrow({ where: { userId: sellerId } })).toMatchObject({ reviewCount: 1, behaviorSum: 5, responseSum: 2, ratingAvg: 3.5 });
  });
});
