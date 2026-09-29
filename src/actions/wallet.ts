"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { num, runAction, type ActionState } from "@/lib/action";
import { createTopupSession, mockTopup, withdraw } from "@/lib/stripe";

export async function topupAction(_: ActionState, fd: FormData) {
  const userId = await requireUserId();
  return runAction(async () => redirect(await createTopupSession(userId, num(fd, "dollars"))));
}

export async function mockTopupAction(_: ActionState, fd: FormData) {
  const userId = await requireUserId();
  const result = await runAction(() => mockTopup(userId, num(fd, "dollars")));
  revalidatePath("/wallet");
  return result;
}

export async function withdrawAction(_: ActionState, fd: FormData) {
  const userId = await requireUserId();
  const result = await runAction(() => withdraw(userId, num(fd, "dollars")));
  revalidatePath("/wallet");
  return result;
}
