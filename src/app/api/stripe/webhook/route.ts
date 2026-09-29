import { handleWebhook } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    await handleWebhook(await req.text(), req.headers.get("stripe-signature") ?? "");
  } catch (e) {
    console.error(e);
    return new Response("Webhook error", { status: 400 });
  }
  return new Response(null, { status: 200 });
}
