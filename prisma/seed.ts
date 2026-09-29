import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const SELLERS = [
  { login: "ada-dev", name: "Ada Park", bio: "Full-stack TS. I run Claude Code with a tuned CLAUDE.md and ship tested PRs.", stack: ["typescript", "react", "next.js", "postgres"], tools: ["claude code"], rate: 150, session: 4000, minutes: 60, cap: 120_000, reviews: [[5, 5], [5, 4], [4, 5]], responseMs: 9 * 60_000 },
  { login: "rustacean", name: "Mo Haddad", bio: "Systems work in Rust and Go. Careful with unsafe, heavy on benchmarks.", stack: ["rust", "go"], tools: ["cursor", "claude code"], rate: 220, session: 6000, minutes: 90, cap: 150_000, reviews: [[5, 3], [4, 3]], responseMs: 42 * 60_000 },
  { login: "py-lin", name: "Lin Chen", bio: "Python data pipelines, FastAPI, Django.", stack: ["python", "fastapi", "django"], tools: ["aider"], rate: 90, session: 2500, minutes: 45, cap: 80_000, reviews: [], responseMs: null },
];

async function main() {
  const buyer = await prisma.user.upsert({ where: { githubLogin: "demo-buyer" }, update: {}, create: { githubLogin: "demo-buyer", name: "Demo Buyer", balance: 20_000 } });

  for (const s of SELLERS) {
    const user = await prisma.user.upsert({ where: { githubLogin: s.login }, update: {}, create: { githubLogin: s.login, name: s.name, image: `https://avatars.githubusercontent.com/${s.login}` } });
    const behaviorSum = s.reviews.reduce((a, [b]) => a + b, 0);
    const responseSum = s.reviews.reduce((a, [, r]) => a + r, 0);
    const answered = s.responseMs ? s.reviews.length + 2 : 0;
    await prisma.sellerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        bio: s.bio,
        stack: s.stack,
        tools: s.tools,
        ratePer10k: s.rate,
        sessionPrice: s.session,
        sessionMinutes: s.minutes,
        sessionTokenCap: s.cap,
        reviewCount: s.reviews.length,
        behaviorSum,
        responseSum,
        ratingAvg: s.reviews.length ? (behaviorSum + responseSum) / (2 * s.reviews.length) : 0,
        answeredCount: answered,
        responseMsSum: BigInt((s.responseMs ?? 0) * answered),
        avgResponseMs: s.responseMs,
      },
    });
    if (await prisma.review.count({ where: { sellerId: user.id } })) continue;
    for (const [behaviorStars, responseStars] of s.reviews) {
      const order = await prisma.order.create({
        data: { buyerId: buyer.id, sellerId: user.id, type: "PROMPT", status: "COMPLETED", held: s.rate * 2, charged: s.rate, tokenCap: 20_000, ratePer10k: s.rate, repoOwner: "demo-buyer", repoName: "shop", baseBranch: "main", closedAt: new Date() },
      });
      await prisma.review.create({ data: { orderId: order.id, buyerId: buyer.id, sellerId: user.id, behaviorStars, responseStars, comment: behaviorStars >= 5 ? "Clean PR, great communication." : "Solid work, a bit slow to reply." } });
    }
  }
}

main().finally(() => prisma.$disconnect());
