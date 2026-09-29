"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { num, runAction, str, type ActionState } from "@/lib/action";
import { acceptOrder, cancelOrder, createOrder, declineOrder, endSession } from "@/lib/orders";

export async function buyAction(_: ActionState, fd: FormData) {
  const buyerId = await requireUserId();
  const type = str(fd, "type") === "SESSION" ? "SESSION" : "PROMPT";
  const [repoOwner, repoName] = str(fd, "repo").split("/");
  return runAction(async () => {
    const order = await createOrder({
      buyerId,
      sellerId: str(fd, "sellerId"),
      type,
      repoOwner,
      repoName,
      baseBranch: str(fd, "branch"),
      prompt: str(fd, "prompt"),
      maxTokens: num(fd, "maxTokens"),
    });
    redirect(`/orders/${order.id}`);
  });
}

export async function orderStepAction(_: ActionState, fd: FormData) {
  const userId = await requireUserId();
  const orderId = str(fd, "orderId");
  const step = str(fd, "step");
  const result = await runAction(() => {
    if (step === "accept") return acceptOrder(orderId, userId);
    if (step === "decline") return declineOrder(orderId, userId);
    if (step === "cancel") return cancelOrder(orderId, userId);
    return endSession(orderId, userId);
  });
  revalidatePath(`/orders/${orderId}`);
  return result;
}
