import { notFound } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import AutoRefresh from "@/components/AutoRefresh";
import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import Countdown from "@/components/Countdown";
import CreditAmount from "@/components/CreditAmount";
import PromptItem from "@/components/PromptItem";
import RepoBox from "@/components/RepoBox";
import ReviewForm from "@/components/ReviewForm";
import ReviewItem from "@/components/ReviewItem";
import StatusBadge from "@/components/StatusBadge";
import TextArea from "@/components/TextArea";
import TokenMeter from "@/components/TokenMeter";
import { orderStepAction } from "@/actions/orders";
import { submitPromptAction } from "@/actions/prompts";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settleIfExpired } from "@/lib/orders";
import { MAX_PROMPT_LENGTH } from "@/lib/limits";

const PERSON = { select: { name: true, image: true, githubLogin: true } };

function loadOrder(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      buyer: PERSON,
      seller: PERSON,
      prompts: { orderBy: { submittedAt: "asc" } },
      review: { include: { buyer: { select: { name: true, image: true } } } },
    },
  });
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  let order = await loadOrder(id);
  if (!order || (order.buyerId !== userId && order.sellerId !== userId)) notFound();
  if (await settleIfExpired(order)) order = (await loadOrder(id))!;

  const isBuyer = order.buyerId === userId;
  const isActive = order.status === "ACTIVE";
  const isOpen = isActive || order.status === "PENDING";
  const isSession = order.type === "SESSION";
  const counterpart = isBuyer ? order.seller : order.buyer;
  const answered = order.prompts.filter((p) => p.answeredAt).length;
  const hasOpenPrompt = order.prompts.some((p) => !p.answeredAt);
  const repoUrl = `https://github.com/${order.repoOwner}/${order.repoName}`;
  const step = (name: string) => ({ orderId: order.id, step: name });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <AutoRefresh enabled={isOpen} />
      <div className="flex flex-col gap-6">
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <Avatar src={counterpart.image} name={counterpart.name} size={40} />
            <div className="flex-1">
              <h1 className="font-semibold">
                {isSession ? "Session" : "Prompt"} {isBuyer ? "from" : "for"} {counterpart.name}
              </h1>
              <p className="text-sm text-zinc-500">@{counterpart.githubLogin}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>
        </Card>

        <Card title="Prompts">
          <div className="flex flex-col gap-6">
            {order.prompts.map((p) => (
              <PromptItem key={p.id} prompt={p} orderId={order.id} repoUrl={repoUrl} workBranch={order.workBranch} canAnswer={!isBuyer && isActive} />
            ))}
            {!order.prompts.length && <p className="text-sm text-zinc-500">{isBuyer ? "Send your first prompt below." : "No prompts yet."}</p>}
            {isBuyer && isActive && isSession && !hasOpenPrompt && (
              <ActionForm action={submitPromptAction} hidden={{ orderId: order.id }} submitLabel="Send prompt" resetOnSuccess>
                <TextArea name="prompt" label="Next prompt" rows={5} required maxLength={MAX_PROMPT_LENGTH} />
              </ActionForm>
            )}
          </div>
        </Card>

        {isBuyer && !isOpen && answered > 0 && (
          <Card title="Your review">{order.review ? <ReviewItem review={order.review} /> : <ReviewForm orderId={order.id} />}</Card>
        )}
      </div>

      <div className="flex flex-col gap-6 self-start">
        <Card title="Details">
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">{isOpen ? "Held" : "Charged"}</span>
              <CreditAmount units={isOpen ? order.held : order.charged} withDollars />
            </div>
            {!isSession && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Rate</span>
                <CreditAmount units={order.ratePer10k} suffix=" / 10k tokens" />
              </div>
            )}
            <TokenMeter used={order.tokensUsed} cap={order.tokenCap} />
            {isActive && order.endsAt && <Countdown until={order.endsAt} label={isSession ? "Time left" : "Deadline in"} />}
            {order.status === "PENDING" && <p className="text-zinc-500">{isBuyer ? "Waiting for the seller to accept. Nothing is charged if they decline." : "Accepting creates the work branch and invites you to the repo."}</p>}
          </div>
          {order.status === "PENDING" && !isBuyer && (
            <div className="mt-4 flex gap-2">
              <ActionForm action={orderStepAction} hidden={step("accept")} submitLabel="Accept" inline />
              <ActionForm action={orderStepAction} hidden={step("decline")} submitLabel="Decline" submitVariant="secondary" confirm="Decline this order?" inline />
            </div>
          )}
          {order.status === "PENDING" && isBuyer && (
            <ActionForm action={orderStepAction} hidden={step("cancel")} submitLabel="Cancel order" submitVariant="secondary" confirm="Cancel and refund?" className="mt-4" />
          )}
          {isActive && isBuyer && isSession && (
            <ActionForm
              action={orderStepAction}
              hidden={step("end")}
              submitLabel="End session"
              submitVariant="danger"
              confirm={answered ? "End the session now? The seller is paid the full session price." : "End the session now? You'll be refunded since nothing was delivered."}
              className="mt-4"
            />
          )}
        </Card>
        <RepoBox repoOwner={order.repoOwner} repoName={order.repoName} baseBranch={order.baseBranch} workBranch={order.workBranch} prNumber={order.prNumber} isBuyer={isBuyer} />
      </div>
    </div>
  );
}
