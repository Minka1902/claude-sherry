import Link from "next/link";
import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import CreditAmount from "@/components/CreditAmount";
import SellerRatings, { type SellerRatingsProps } from "@/components/SellerRatings";
import Tags from "@/components/Tags";

export type SellerCardData = SellerRatingsProps["seller"] & {
  userId: string;
  bio: string;
  stack: string[];
  tools: string[];
  ratePer10k: number;
  sessionPrice: number;
  sessionMinutes: number;
  user: { name: string | null; image: string | null; githubLogin: string | null };
};

export default function SellerCard({ seller, className = "" }: { seller: SellerCardData; className?: string }) {
  return (
    <Link href={`/sellers/${seller.userId}`} className={`block transition-transform hover:-translate-y-0.5 ${className}`}>
      <Card className="h-full">
        <div className="flex items-center gap-3">
          <Avatar src={seller.user.image} name={seller.user.name} size={44} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{seller.user.name}</p>
            <p className="text-sm text-zinc-500">@{seller.user.githubLogin}</p>
          </div>
        </div>
        <SellerRatings seller={seller} className="mt-3" />
        {seller.bio && <p className="mt-3 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{seller.bio}</p>}
        <Tags tags={[...seller.stack, ...seller.tools]} className="mt-3" />
        <div className="mt-4 flex justify-between border-t border-zinc-100 pt-3 text-sm dark:border-zinc-800">
          <CreditAmount units={seller.ratePer10k} suffix=" / 10k tok" />
          <span>
            <CreditAmount units={seller.sessionPrice} /> / {seller.sessionMinutes}m
          </span>
        </div>
      </Card>
    </Link>
  );
}
