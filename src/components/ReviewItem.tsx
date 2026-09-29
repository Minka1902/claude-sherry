import Avatar from "@/components/Avatar";
import LocalTime from "@/components/LocalTime";
import StarRating from "@/components/StarRating";

export type ReviewData = { id: string; behaviorStars: number; responseStars: number; comment: string; createdAt: Date; buyer: { name: string | null; image: string | null } };

export default function ReviewItem({ review, className = "" }: { review: ReviewData; className?: string }) {
  return (
    <article className={`flex gap-3 py-4 ${className}`}>
      <Avatar src={review.buyer.image} name={review.buyer.name} size={32} />
      <div className="flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-medium">{review.buyer.name}</span>
          <LocalTime value={review.createdAt} options={{ dateStyle: "medium" }} className="text-xs text-zinc-500" />
        </div>
        <div className="mt-1 flex flex-wrap gap-4">
          <StarRating value={review.behaviorStars} readOnly size="sm" label="Behavior" />
          <StarRating value={review.responseStars} readOnly size="sm" label="Response" />
        </div>
        {review.comment && <p className="mt-2 whitespace-pre-line text-sm">{review.comment}</p>}
      </div>
    </article>
  );
}
