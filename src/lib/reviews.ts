import "server-only";
import { prisma } from "@/lib/prisma";
import { AppError, assert } from "@/lib/errors";
import { MAX_COMMENT_LENGTH } from "@/lib/limits";

const isStar = (n: number) => Number.isInteger(n) && n >= 1 && n <= 5;

export async function createReview(orderId: string, buyerId: string, behaviorStars: number, responseStars: number, comment: string) {
  assert(isStar(behaviorStars) && isStar(responseStars), "Stars must be 1–5");
  assert(comment.length <= MAX_COMMENT_LENGTH, `Review is longer than ${MAX_COMMENT_LENGTH} characters`);

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { buyerId: true, sellerId: true, status: true, review: { select: { id: true } }, _count: { select: { prompts: { where: { answeredAt: { not: null } } } } } },
  });
  assert(order.buyerId === buyerId, "Not your order");
  assert(order.status === "COMPLETED" || order.status === "EXPIRED", "You can review after the order is closed");
  assert(order._count.prompts > 0, "Nothing was delivered on this order");
  assert(!order.review, "Already reviewed");

  try {
    await prisma.$transaction([
      prisma.review.create({ data: { orderId, buyerId, sellerId: order.sellerId, behaviorStars, responseStars, comment: comment.trim() } }),
      prisma.$executeRaw`UPDATE "SellerProfile" SET "reviewCount" = "reviewCount" + 1, "behaviorSum" = "behaviorSum" + ${behaviorStars}, "responseSum" = "responseSum" + ${responseStars}, "ratingAvg" = ("behaviorSum" + "responseSum" + ${behaviorStars + responseStars})::float / (2 * ("reviewCount" + 1)) WHERE "userId" = ${order.sellerId}`,
    ]);
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") throw new AppError("Already reviewed");
    throw e;
  }
}
