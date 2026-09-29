import "server-only";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { AppError, assert } from "@/lib/errors";
import { credit } from "@/lib/ledger";
import { dollarsToUnits, unitsToCents } from "@/lib/credits";

export const MIN_TOPUP_DOLLARS = 5;
export const MAX_TOPUP_DOLLARS = 1000;
export const MIN_WITHDRAW_DOLLARS = 10;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const APP_URL = process.env.AUTH_URL!;

const isCents = (dollars: number) => Number.isFinite(dollars) && Math.abs(dollars * 100 - Math.round(dollars * 100)) < 1e-9;

export const mockTopupEnabled = () => process.env.ALLOW_MOCK_TOPUP === "true";

export async function createTopupSession(userId: string, dollars: number) {
  assert(isCents(dollars) && dollars >= MIN_TOPUP_DOLLARS && dollars <= MAX_TOPUP_DOLLARS, `Top-up must be $${MIN_TOPUP_DOLLARS}–$${MAX_TOPUP_DOLLARS}`);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: Math.round(dollars * 100), product_data: { name: `${dollars * 2} Sherry credits` } } }],
    metadata: { userId, units: String(dollarsToUnits(dollars)) },
    success_url: `${APP_URL}/wallet?topup=success`,
    cancel_url: `${APP_URL}/wallet`,
  });
  return session.url!;
}

export async function mockTopup(userId: string, dollars: number) {
  assert(mockTopupEnabled(), "Mock top-up is disabled");
  assert(isCents(dollars) && dollars > 0 && dollars <= MAX_TOPUP_DOLLARS, "Invalid amount");
  await prisma.$transaction((tx) => credit(tx, userId, dollarsToUnits(dollars), "TOPUP"));
}

export async function handleWebhook(body: string, signature: string) {
  const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") return;
  const session = event.data.object;
  if (session.payment_status !== "paid") return;
  try {
    await prisma.$transaction((tx) => credit(tx, session.metadata!.userId, Number(session.metadata!.units), "TOPUP", undefined, session.id));
  } catch (e) {
    if ((e as { code?: string }).code !== "P2002") throw e;
  }
}

export async function createConnectLink(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { stripeAccountId: true, email: true } });
  let accountId = user.stripeAccountId;
  if (!accountId) {
    accountId = (await stripe.accounts.create({ type: "express", email: user.email ?? undefined, capabilities: { transfers: { requested: true } } })).id;
    await prisma.user.update({ where: { id: userId }, data: { stripeAccountId: accountId } });
  }
  const link = await stripe.accountLinks.create({ account: accountId, type: "account_onboarding", refresh_url: `${APP_URL}/api/stripe/connect`, return_url: `${APP_URL}/wallet` });
  return link.url;
}

/** Rolls back only on a definite rejection; on network/API errors the transfer may exist, so the debit stays for reconciliation. */
export async function withdraw(userId: string, dollars: number) {
  assert(isCents(dollars) && dollars >= MIN_WITHDRAW_DOLLARS, `Minimum withdrawal is $${MIN_WITHDRAW_DOLLARS}`);
  const units = dollarsToUnits(dollars);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { stripeAccountId: true } });
  assert(user.stripeAccountId, "Connect a Stripe account first");
  assert((await stripe.accounts.retrieve(user.stripeAccountId)).payouts_enabled, "Finish Stripe onboarding first");

  const entry = await prisma.$transaction(async (tx) => {
    const { count } = await tx.user.updateMany({
      where: { id: userId, balance: { gte: units }, withdrawable: { gte: units } },
      data: { balance: { decrement: units }, withdrawable: { decrement: units } },
    });
    if (count === 0) throw new AppError("Only earned credits you still hold can be withdrawn");
    return tx.ledgerEntry.create({ data: { userId, amount: -units, kind: "WITHDRAW" } });
  });

  try {
    const transfer = await stripe.transfers.create({ amount: unitsToCents(units), currency: "usd", destination: user.stripeAccountId }, { idempotencyKey: entry.id });
    await prisma.ledgerEntry.update({ where: { id: entry.id }, data: { stripeRef: transfer.id } });
  } catch (e) {
    if (!(e instanceof Stripe.errors.StripeInvalidRequestError)) throw e;
    await prisma.$transaction([
      prisma.ledgerEntry.delete({ where: { id: entry.id } }),
      prisma.user.update({ where: { id: userId }, data: { balance: { increment: units }, withdrawable: { increment: units } } }),
    ]);
    throw e;
  }
}
