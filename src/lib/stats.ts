type SellerSums = { reviewCount: number; behaviorSum: number; responseSum: number; ratingAvg: number; avgResponseMs: number | null };

export function sellerStats(s: SellerSums) {
  return {
    reviews: s.reviewCount,
    behavior: s.reviewCount ? s.behaviorSum / s.reviewCount : 0,
    response: s.reviewCount ? s.responseSum / s.reviewCount : 0,
    overall: s.ratingAvg,
    avgResponseMs: s.avgResponseMs,
  };
}

export function formatDuration(ms: number | null) {
  if (ms === null) return "—";
  const min = Math.round(ms / 60_000);
  if (min < 1) return "<1 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return min % 60 ? `${h}h ${min % 60}m` : `${h}h`;
}
