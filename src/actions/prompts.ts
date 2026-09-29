"use server";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { runAction, str, type ActionState } from "@/lib/action";
import { answerPrompt, submitPrompt } from "@/lib/orders";

export async function submitPromptAction(_: ActionState, fd: FormData) {
  const buyerId = await requireUserId();
  const orderId = str(fd, "orderId");
  const result = await runAction(() => submitPrompt(orderId, buyerId, str(fd, "prompt")));
  revalidatePath(`/orders/${orderId}`);
  return result;
}

export async function answerPromptAction(_: ActionState, fd: FormData) {
  const sellerId = await requireUserId();
  const result = await runAction(() => answerPrompt(str(fd, "promptId"), sellerId, str(fd, "note")));
  revalidatePath(`/orders/${str(fd, "orderId")}`);
  return result;
}
