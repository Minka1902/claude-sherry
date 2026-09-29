"use server";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { num, runAction, str, type ActionState } from "@/lib/action";
import { saveSellerProfile } from "@/lib/sellers";

export async function saveSellerAction(_: ActionState, fd: FormData) {
  const userId = await requireUserId();
  const result = await runAction(() =>
    saveSellerProfile(userId, {
      bio: str(fd, "bio"),
      stack: str(fd, "stack"),
      tools: str(fd, "tools"),
      isActive: fd.get("isActive") === "on",
      rate: num(fd, "rate"),
      sessionPrice: num(fd, "sessionPrice"),
      sessionMinutes: num(fd, "sessionMinutes"),
      sessionTokenCap: num(fd, "sessionTokenCap"),
    }),
  );
  revalidatePath(`/sellers/${userId}`);
  return result;
}
