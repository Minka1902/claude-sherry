import "server-only";
import { unstable_rethrow } from "next/navigation";
import { AppError } from "@/lib/errors";

export type ActionState = { error?: string; ok?: boolean } | null;

export async function runAction(fn: () => Promise<unknown>): Promise<ActionState> {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof AppError) return { error: e.message };
    console.error(e);
    return { error: "Something went wrong, try again" };
  }
}

export const str = (fd: FormData, key: string) => String(fd.get(key) ?? "");

export const num = (fd: FormData, key: string) => Number(fd.get(key));
