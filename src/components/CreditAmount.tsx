import { formatCredits, formatDollars } from "@/lib/credits";

export default function CreditAmount({ units, withDollars, suffix, className = "" }: { units: number; withDollars?: boolean; suffix?: string; className?: string }) {
  return (
    <span className={`tabular-nums ${className}`}>
      {formatCredits(units)}
      {suffix}
      {withDollars && <span className="ml-1 text-zinc-500">({formatDollars(units)})</span>}
    </span>
  );
}
