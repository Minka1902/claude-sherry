import StarRating from "@/components/StarRating";
import { formatDuration, sellerStats } from "@/lib/stats";

export type SellerRatingsProps = {
  seller: { reviewCount: number; behaviorSum: number; responseSum: number; ratingAvg: number; avgResponseMs: number | null };
  detailed?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export default function SellerRatings({ seller, detailed, size = "sm", className = "" }: SellerRatingsProps) {
  const stats = sellerStats(seller);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <StarRating value={stats.overall} readOnly size={size} showValue count={stats.reviews} />
      {detailed && (
        <>
          <StarRating value={stats.behavior} readOnly size="sm" showValue label="Behavior" />
          <StarRating value={stats.response} readOnly size="sm" showValue label="Response" />
        </>
      )}
      <span className="text-xs text-zinc-500">Avg response: {formatDuration(stats.avgResponseMs)}</span>
    </div>
  );
}
