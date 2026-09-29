import "server-only";
import type { Order } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError, assert } from "@/lib/errors";
import { credit, debit } from "@/lib/ledger";
import { splitHold, tokenPrice } from "@/lib/credits";
import { analyzeDiff } from "@/lib/tokenizer";
import { MAX_NOTE_LENGTH, MAX_PROMPT_LENGTH, MAX_PROMPT_TOKENS } from "@/lib/limits";
import { compare, createBranch, getBranchSha, getUserToken, GitHubError, inviteCollaborator, openPullRequest, revokeAccess, verifyRepo } from "@/lib/github";

export const PENDING_TTL_MS = 24 * 60 * 60 * 1000;
export const PROMPT_DEADLINE_MS = 24 * 60 * 60 * 1000;

type ClosedStatus = "COMPLETED" | "CANCELLED" | "EXPIRED";

type CreateOrderInput = {
  buyerId: string;
  sellerId: string;
  type: "PROMPT" | "SESSION";
  repoOwner: string;
  repoName: string;
  baseBranch: string;
  prompt?: string;
  maxTokens?: number;
};

const workBranchName = (orderId: string) => `sherry/order-${orderId}`;

function checkPrompt(content: string | undefined) {
  const text = content?.trim();
  assert(text, "Prompt is empty");
  assert(text.length <= MAX_PROMPT_LENGTH, `Prompt is longer than ${MAX_PROMPT_LENGTH} characters`);
  return text;
}

async function afterClose(order: Pick<Order, "id" | "buyerId" | "sellerId" | "repoOwner" | "repoName" | "inviteId" | "acceptedAt">) {
  if (!order.acceptedAt) return;
  try {
    const [token, seller] = await Promise.all([
      getUserToken(order.buyerId),
      prisma.user.findUniqueOrThrow({ where: { id: order.sellerId }, select: { githubLogin: true } }),
    ]);
    await revokeAccess(token, order.repoOwner, order.repoName, seller.githubLogin!, order.inviteId);
  } catch (e) {
    console.error(`revoke access failed for order ${order.id}`, e);
  }
}

export async function createOrder(input: CreateOrderInput) {
  assert(input.buyerId !== input.sellerId, "You can't buy from yourself");
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: input.sellerId } });
  assert(seller?.isActive, "Seller is not available");

  const isPrompt = input.type === "PROMPT";
  const prompt = isPrompt ? checkPrompt(input.prompt) : null;
  const maxTokens = isPrompt ? input.maxTokens! : seller.sessionTokenCap;
  assert(Number.isInteger(maxTokens) && maxTokens > 0 && maxTokens <= MAX_PROMPT_TOKENS, `Max tokens must be 1–${MAX_PROMPT_TOKENS}`);
  const held = isPrompt ? tokenPrice(maxTokens, seller.ratePer10k) : seller.sessionPrice;
  assert(held > 0, "Price must be above zero");

  await verifyRepo(await getUserToken(input.buyerId), input.repoOwner, input.repoName, input.baseBranch);

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        buyerId: input.buyerId,
        sellerId: input.sellerId,
        type: input.type,
        held,
        tokenCap: maxTokens,
        ratePer10k: seller.ratePer10k,
        sessionMinutes: isPrompt ? null : seller.sessionMinutes,
        repoOwner: input.repoOwner,
        repoName: input.repoName,
        baseBranch: input.baseBranch,
        prompts: prompt ? { create: { content: prompt } } : undefined,
      },
    });
    await debit(tx, input.buyerId, held, "HOLD", order.id);
    return order;
  });
}

/** Closes an open order exactly once and moves the hold; returns false when it was already closed. */
export async function closeOrder(orderId: string, status: ClosedStatus) {
  const order = await prisma.$transaction(async (tx) => {
    const current = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: current.status, OR: [{ status: "PENDING" }, { status: "ACTIVE" }] },
      data: { status, closedAt: new Date() },
    });
    if (count === 0) return null;

    const answered = current.type === "SESSION" && current.status === "ACTIVE" ? await tx.prompt.count({ where: { orderId, answeredAt: { not: null } } }) : 0;
    if (answered > 0) {
      await tx.order.update({ where: { id: orderId }, data: { charged: current.held } });
      await credit(tx, current.sellerId, current.held, "EARN", orderId);
    } else {
      await credit(tx, current.buyerId, current.held, "REFUND", orderId);
    }
    return current;
  });
  if (!order) return false;
  await afterClose(order);
  return true;
}

export async function settleIfExpired(order: Pick<Order, "id" | "status" | "endsAt" | "createdAt">) {
  const now = Date.now();
  if (order.status === "ACTIVE" && order.endsAt && order.endsAt.getTime() <= now) return closeOrder(order.id, "EXPIRED");
  if (order.status === "PENDING" && order.createdAt.getTime() + PENDING_TTL_MS <= now) return closeOrder(order.id, "CANCELLED");
  return false;
}

export async function settleAllExpired() {
  const now = new Date();
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { status: "ACTIVE", endsAt: { lte: now } },
        { status: "PENDING", createdAt: { lte: new Date(now.getTime() - PENDING_TTL_MS) } },
      ],
    },
    select: { id: true, status: true },
  });
  for (const o of orders) await closeOrder(o.id, o.status === "ACTIVE" ? "EXPIRED" : "CANCELLED");
  return orders.length;
}

export async function acceptOrder(orderId: string, sellerId: string) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { seller: { select: { githubLogin: true } } } });
  assert(order.sellerId === sellerId, "Not your order");
  if (await settleIfExpired(order)) throw new AppError("Order expired");
  assert(order.status === "PENDING", "Order is not pending");

  const token = await getUserToken(order.buyerId);
  const workBranch = workBranchName(order.id);
  let sha = await getBranchSha(token, order.repoOwner, order.repoName, order.baseBranch);
  try {
    await createBranch(token, order.repoOwner, order.repoName, workBranch, sha);
  } catch (e) {
    if (!(e instanceof GitHubError && e.status === 422)) throw e;
    sha = await getBranchSha(token, order.repoOwner, order.repoName, workBranch);
  }
  const inviteId = await inviteCollaborator(token, order.repoOwner, order.repoName, order.seller.githubLogin!);

  const now = new Date();
  const endsAt = new Date(now.getTime() + (order.type === "SESSION" ? order.sessionMinutes! * 60_000 : PROMPT_DEADLINE_MS));
  const accepted = await prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { status: "ACTIVE", acceptedAt: now, endsAt, workBranch, baseSha: sha, lastSha: sha, inviteId },
    });
    if (count === 1) await tx.prompt.updateMany({ where: { orderId }, data: { fromSha: sha } });
    return count === 1;
  });
  if (!accepted) {
    await afterClose({ ...order, inviteId, acceptedAt: now });
    throw new AppError("Order is no longer pending");
  }
}

export async function declineOrder(orderId: string, sellerId: string) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { sellerId: true, status: true } });
  assert(order.sellerId === sellerId, "Not your order");
  assert(order.status === "PENDING", "Order is not pending");
  assert(await closeOrder(orderId, "CANCELLED"), "Order changed, refresh and try again");
}

export async function cancelOrder(orderId: string, buyerId: string) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { buyerId: true, status: true } });
  assert(order.buyerId === buyerId, "Not your order");
  assert(order.status === "PENDING", "Only pending orders can be cancelled");
  assert(await closeOrder(orderId, "CANCELLED"), "Order changed, refresh and try again");
}

export async function endSession(orderId: string, buyerId: string) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { buyerId: true, status: true, type: true } });
  assert(order.buyerId === buyerId, "Not your order");
  assert(order.type === "SESSION" && order.status === "ACTIVE", "Session is not active");
  assert(await closeOrder(orderId, "COMPLETED"), "Order changed, refresh and try again");
}

export async function submitPrompt(orderId: string, buyerId: string, content: string) {
  const text = checkPrompt(content);
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  assert(order.buyerId === buyerId, "Not your order");
  if (await settleIfExpired(order)) throw new AppError("Session ended");
  assert(order.type === "SESSION" && order.status === "ACTIVE", "Session is not active");

  return prisma.$transaction(async (tx) => {
    const [locked] = await tx.$queryRaw<{ status: string; lastSha: string }[]>`SELECT status, "lastSha" FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    assert(locked.status === "ACTIVE", "Session is not active");
    const open = await tx.prompt.count({ where: { orderId, answeredAt: null } });
    assert(open === 0, "Wait for the seller to finish the current prompt");
    return tx.prompt.create({ data: { orderId, content: text, fromSha: locked.lastSha } });
  });
}

export async function answerPrompt(promptId: string, sellerId: string, note: string) {
  const prompt = await prisma.prompt.findUniqueOrThrow({ where: { id: promptId }, include: { order: true } });
  const { order } = prompt;
  assert(order.sellerId === sellerId, "Not your order");
  if (await settleIfExpired(order)) throw new AppError("Order time is over");
  assert(order.status === "ACTIVE", "Order is not active");
  assert(!prompt.answeredAt, "Prompt already answered");
  assert(note.length <= MAX_NOTE_LENGTH, `Note is longer than ${MAX_NOTE_LENGTH} characters`);

  const token = await getUserToken(order.buyerId);
  const head = await getBranchSha(token, order.repoOwner, order.repoName, order.workBranch!);
  const diff = await compare(token, order.repoOwner, order.repoName, order.lastSha!, head);
  assert(diff.status !== "identical", `No new commits on ${order.workBranch}`);
  assert(diff.status === "ahead", `History of ${order.workBranch} was rewritten — don't force-push the order branch`);
  const { tokens, uncountedFiles } = analyzeDiff(diff.diff);

  const answeredAt = new Date();
  const responseMs = answeredAt.getTime() - Math.max(prompt.submittedAt.getTime(), order.acceptedAt!.getTime());
  const tokensUsed = order.tokensUsed + tokens;
  const closes = order.type === "PROMPT" || tokensUsed >= order.tokenCap;

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: order.id, status: "ACTIVE", lastSha: order.lastSha },
      data: { lastSha: head, tokensUsed, ...(closes ? { status: "COMPLETED", closedAt: answeredAt } : {}) },
    });
    if (count === 0) throw new AppError("Order changed, refresh and try again");

    await tx.prompt.update({
      where: { id: promptId },
      data: { toSha: head, answerNote: note.trim() || null, answerTokens: tokens, uncountedFiles: [...uncountedFiles, ...diff.uncountedFiles], answeredAt, responseMs },
    });
    await tx.$executeRaw`UPDATE "SellerProfile" SET "answeredCount" = "answeredCount" + 1, "responseMsSum" = "responseMsSum" + ${responseMs}, "avgResponseMs" = (("responseMsSum" + ${responseMs}) / ("answeredCount" + 1))::int WHERE "userId" = ${sellerId}`;

    if (!closes) return;
    const { charged, refund } = order.type === "PROMPT" ? splitHold(order.held, tokens, order.tokenCap, order.ratePer10k) : { charged: order.held, refund: 0 };
    await tx.order.update({ where: { id: order.id }, data: { charged } });
    await credit(tx, sellerId, charged, "EARN", order.id);
    await credit(tx, order.buyerId, refund, "REFUND", order.id);
  });

  if (order.prNumber === null) {
    try {
      const prNumber = await openPullRequest(token, order.repoOwner, order.repoName, order.workBranch!, order.baseBranch, `Sherry order ${order.id}`, `Work delivered through Sherry order \`${order.id}\`.`);
      await prisma.order.update({ where: { id: order.id }, data: { prNumber } });
    } catch (e) {
      if (!(e instanceof GitHubError && e.status === 422)) console.error(`open PR failed for order ${order.id}`, e);
    }
  }
  if (closes) await afterClose(order);
  return { tokens, closed: closes };
}
