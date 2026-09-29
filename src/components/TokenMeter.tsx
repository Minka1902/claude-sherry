export default function TokenMeter({ used, cap, label = "Output tokens", className = "" }: { used: number; cap: number; label?: string; className?: string }) {
  const pct = Math.min(100, (used / cap) * 100);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex justify-between text-sm">
        <span className="text-zinc-500">{label}</span>
        <span className="tabular-nums">
          {used.toLocaleString()} / {cap.toLocaleString()}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : "bg-accent"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
