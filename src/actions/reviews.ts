"use server";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { num, runAction, str, type ActionState } from "@/lib/action";
import { createReview } from "@/lib/reviews";

export async function reviewAction(_: ActionState, fd: FormData) {
  const buyerId = await requireUserId();
  const orderId = str(fd, "orderId");
  const result = await runAction(() => createReview(orderId, buyerId, num(fd, "behaviorStars"), num(fd, "responseStars"), str(fd, "comment")));
  revalidatePath(`/orders/${orderId}`);
  return result;
}
