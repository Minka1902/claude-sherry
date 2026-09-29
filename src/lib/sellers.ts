import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { assert } from "@/lib/errors";
import { creditsToUnits } from "@/lib/credits";
import { MAX_BIO_LENGTH, MAX_PROMPT_TOKENS } from "@/lib/limits";

export const SORTS = { rating: "Top rated", response: "Fastest", price: "Cheapest", new: "Newest" } as const;
export type SellerSort = keyof typeof SORTS;

const MAX_TAGS = 15;
const MAX_SESSION_MINUTES = 7 * 24 * 60;
export const SELLERS_PAGE_SIZE = 24;

const ORDER_BY: Record<SellerSort, Prisma.SellerProfileOrderByWithRelationInput[]> = {
  rating: [{ ratingAvg: "desc" }, { reviewCount: "desc" }],
  response: [{ avgResponseMs: { sort: "asc", nulls: "last" } }],
  price: [{ ratePer10k: "asc" }],
  new: [{ createdAt: "desc" }],
};

export const parseTags = (raw: string) => [...new Set(raw.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, MAX_TAGS);

export type SellerInput = { bio: string; stack: string; tools: string; isActive: boolean; rate: number; sessionPrice: number; sessionMinutes: number; sessionTokenCap: number };

export async function saveSellerProfile(userId: string, input: SellerInput) {
  const positive = (n: number) => Number.isFinite(n) && n > 0;
  assert(input.bio.length <= MAX_BIO_LENGTH, `Bio is longer than ${MAX_BIO_LENGTH} characters`);
  assert(positive(input.rate) && positive(input.sessionPrice), "Prices must be above zero");
  assert(Number.isInteger(input.sessionMinutes) && input.sessionMinutes >= 5 && input.sessionMinutes <= MAX_SESSION_MINUTES, `Session length must be 5–${MAX_SESSION_MINUTES} minutes`);
  assert(Number.isInteger(input.sessionTokenCap) && input.sessionTokenCap >= 1000 && input.sessionTokenCap <= MAX_PROMPT_TOKENS, `Token cap must be 1,000–${MAX_PROMPT_TOKENS}`);

  const data = {
    bio: input.bio.trim(),
    stack: parseTags(input.stack),
    tools: parseTags(input.tools),
    isActive: input.isActive,
    ratePer10k: creditsToUnits(input.rate),
    sessionPrice: creditsToUnits(input.sessionPrice),
    sessionMinutes: input.sessionMinutes,
    sessionTokenCap: input.sessionTokenCap,
  };
  await prisma.sellerProfile.upsert({ where: { userId }, create: { userId, ...data }, update: data });
}

export function listSellers({ tag, sort = "rating", page = 1 }: { tag?: string; sort?: SellerSort; page?: number }) {
  const t = tag?.trim().toLowerCase();
  return prisma.sellerProfile.findMany({
    where: { isActive: true, ...(t ? { OR: [{ stack: { has: t } }, { tools: { has: t } }] } : {}) },
    orderBy: ORDER_BY[sort] ?? ORDER_BY.rating,
    include: { user: { select: { name: true, image: true, githubLogin: true } } },
    skip: (Math.max(page, 1) - 1) * SELLERS_PAGE_SIZE,
    take: SELLERS_PAGE_SIZE,
  });
}

export function getSeller(userId: string) {
  return prisma.sellerProfile.findUnique({
    where: { userId },
    include: {
      user: { select: { name: true, image: true, githubLogin: true } },
      reviews: { orderBy: { createdAt: "desc" }, take: 50, include: { buyer: { select: { name: true, image: true } } } },
    },
  });
}
