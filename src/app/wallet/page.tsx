import ActionForm from "@/components/ActionForm";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import CreditAmount from "@/components/CreditAmount";
import Input from "@/components/Input";
import LocalTime from "@/components/LocalTime";
import { mockTopupAction, topupAction, withdrawAction } from "@/actions/wallet";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_TOPUP_DOLLARS, MIN_TOPUP_DOLLARS, MIN_WITHDRAW_DOLLARS, mockTopupEnabled } from "@/lib/stripe";
import { CREDITS_PER_DOLLAR } from "@/lib/credits";

const KIND_LABEL = { TOPUP: "Top-up", HOLD: "Order hold", EARN: "Earning", REFUND: "Refund", WITHDRAW: "Withdrawal" };

export default async function WalletPage({ searchParams }: { searchParams: Promise<{ topup?: string }> }) {
  const userId = await requireUserId();
  const [user, ledger, { topup }] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { balance: true, withdrawable: true, stripeAccountId: true } }),
    prisma.ledgerEntry.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }),
    searchParams,
  ]);
  const withdrawableNow = Math.min(user.balance, user.withdrawable);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Wallet</h1>
      {topup === "success" && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300">Payment received — credits appear as soon as Stripe confirms it.</p>}
      <div className="grid gap-6 md:grid-cols-3">
        <Card title="Balance">
          <CreditAmount units={user.balance} withDollars className="text-2xl font-bold" />
          <p className="mt-2 text-sm text-zinc-500">
            $1 = {CREDITS_PER_DOLLAR} credits · withdrawable: <CreditAmount units={withdrawableNow} />
          </p>
        </Card>
        <Card title="Top up">
          <ActionForm action={topupAction} submitLabel="Pay with Stripe" submitFullWidth>
            <Input name="dollars" type="number" label="Amount (USD)" min={MIN_TOPUP_DOLLARS} max={MAX_TOPUP_DOLLARS} step={0.01} defaultValue={10} required />
          </ActionForm>
          {mockTopupEnabled() && (
            <ActionForm action={mockTopupAction} hidden={{ dollars: "10" }} submitLabel="Dev: add $10 of credits" submitVariant="ghost" submitSize="sm" className="mt-2" />
          )}
        </Card>
        <Card title="Withdraw earnings">
          {user.stripeAccountId ? (
            <ActionForm action={withdrawAction} submitLabel="Withdraw" submitFullWidth successMessage="Transfer sent to your Stripe account">
              <Input name="dollars" type="number" label="Amount (USD)" min={MIN_WITHDRAW_DOLLARS} step={0.01} required />
            </ActionForm>
          ) : (
            <Button href="/api/stripe/connect" native variant="secondary" fullWidth>
              Connect Stripe to get paid
            </Button>
          )}
        </Card>
      </div>
      <Card title="History" padded={false} className="[&>header]:px-5 [&>header]:pt-5">
        {ledger.length ? (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {ledger.map((e) => (
              <div key={e.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                <Badge tone={e.amount > 0 ? "green" : "neutral"}>{KIND_LABEL[e.kind]}</Badge>
                <LocalTime value={e.createdAt} className="flex-1 text-zinc-500" />
                <CreditAmount units={e.amount} className={e.amount > 0 ? "text-green-600" : ""} />
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 pb-5 text-sm text-zinc-500">No transactions yet.</p>
        )}
      </Card>
    </div>
  );
}
