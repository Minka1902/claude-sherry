"use client";
import ActionForm from "@/components/ActionForm";
import StarRating from "@/components/StarRating";
import TextArea from "@/components/TextArea";
import { reviewAction } from "@/actions/reviews";
import { MAX_COMMENT_LENGTH } from "@/lib/limits";

export default function ReviewForm({ orderId, className }: { orderId: string; className?: string }) {
  return (
    <ActionForm action={reviewAction} hidden={{ orderId }} submitLabel="Submit review" className={className}>
      <StarRating name="behaviorStars" label="Behavior" size="lg" />
      <StarRating name="responseStars" label="Response time" size="lg" />
      <TextArea name="comment" label="Comment" rows={3} maxLength={MAX_COMMENT_LENGTH} placeholder="How was working with this seller?" />
    </ActionForm>
  );
}
