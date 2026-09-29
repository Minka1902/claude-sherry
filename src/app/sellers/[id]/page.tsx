import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import BuyPanel from "@/components/BuyPanel";
import Card from "@/components/Card";
import CreditAmount from "@/components/CreditAmount";
import ReviewItem from "@/components/ReviewItem";
import SellerRatings from "@/components/SellerRatings";
import Tags from "@/components/Tags";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSeller } from "@/lib/sellers";

export default async function SellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [seller, session] = await Promise.all([getSeller(id), auth()]);
  if (!seller) notFound();
  const viewerId = session?.user.id;
  const viewer = viewerId ? await prisma.user.findUnique({ where: { id: viewerId }, select: { balance: true } }) : null;
  const tagHref = (t: string) => `/?tag=${encodeURIComponent(t)}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-6">
        <Card>
          <div className="flex items-start gap-4">
            <Avatar src={seller.user.image} name={seller.user.name} size={72} />
            <div className="flex-1">
              <h1 className="text-xl font-bold">{seller.user.name}</h1>
              <a href={`https://github.com/${seller.user.githubLogin}`} target="_blank" rel="noreferrer" className="text-sm text-zinc-500 hover:underline">
                @{seller.user.githubLogin}
              </a>
              <SellerRatings seller={seller} detailed size="md" className="mt-3" />
            </div>
          </div>
          {seller.bio && <p className="mt-4 whitespace-pre-line text-sm">{seller.bio}</p>}
          <Tags tags={seller.stack} tone="blue" hrefFor={tagHref} className="mt-4" />
          <Tags tags={seller.tools} hrefFor={tagHref} className="mt-2" />
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4 text-sm dark:border-zinc-800">
            <dt className="text-zinc-500">Per prompt</dt>
            <dd><CreditAmount units={seller.ratePer10k} suffix=" / 10k tokens" withDollars /></dd>
            <dt className="text-zinc-500">Session</dt>
            <dd>
              <CreditAmount units={seller.sessionPrice} withDollars /> · {seller.sessionMinutes} min · {seller.sessionTokenCap.toLocaleString()} tokens
            </dd>
            <dt className="text-zinc-500">Delivered prompts</dt>
            <dd>{seller.answeredCount}</dd>
          </dl>
        </Card>
        <Card title={`Reviews (${seller.reviewCount})`}>
          {seller.reviews.length ? (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {seller.reviews.map((r) => (
                <ReviewItem key={r.id} review={r} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No reviews yet.</p>
          )}
        </Card>
      </div>
      {viewerId !== id && seller.isActive && (
        <BuyPanel
          sellerId={id}
          ratePer10k={seller.ratePer10k}
          sessionPrice={seller.sessionPrice}
          sessionMinutes={seller.sessionMinutes}
          sessionTokenCap={seller.sessionTokenCap}
          balance={viewer?.balance ?? null}
          className="self-start lg:sticky lg:top-6"
        />
      )}
    </div>
  );
}
