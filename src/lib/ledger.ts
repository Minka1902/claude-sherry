import "server-only";
import type { LedgerKind } from "@/generated/prisma/enums";
import type { TransactionClient } from "@/generated/prisma/internal/prismaNamespace";
import { AppError } from "@/lib/errors";

export async function debit(tx: TransactionClient, userId: string, amount: number, kind: LedgerKind, orderId?: string) {
  const { count } = await tx.user.updateMany({ where: { id: userId, balance: { gte: amount } }, data: { balance: { decrement: amount } } });
  if (count === 0) throw new AppError("Not enough credits");
  await tx.ledgerEntry.create({ data: { userId, amount: -amount, kind, orderId } });
}

export async function credit(tx: TransactionClient, userId: string, amount: number, kind: LedgerKind, orderId?: string, stripeRef?: string) {
  if (amount <= 0) return;
  await tx.user.update({ where: { id: userId }, data: { balance: { increment: amount }, ...(kind === "EARN" ? { withdrawable: { increment: amount } } : {}) } });
  await tx.ledgerEntry.create({ data: { userId, amount, kind, orderId, stripeRef } });
}
