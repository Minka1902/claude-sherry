import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { createConnectLink } from "@/lib/stripe";

export async function GET() {
  redirect(await createConnectLink(await requireUserId()));
}
