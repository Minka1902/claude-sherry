"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function format(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

export default function Countdown({ until, label, refreshOnEnd = true, className = "" }: { until: string | Date; label?: string; refreshOnEnd?: boolean; className?: string }) {
  const router = useRouter();
  const end = new Date(until).getTime();
  const [left, setLeft] = useState(() => end - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const next = end - Date.now();
      setLeft(next);
      if (next <= 0) {
        clearInterval(id);
        if (refreshOnEnd) router.refresh();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [end, refreshOnEnd, router]);

  return (
    <span className={`tabular-nums ${left < 5 * 60_000 ? "text-red-600" : ""} ${className}`}>
      {label && <span className="mr-1 text-zinc-500">{label}</span>}
      {format(left)}
    </span>
  );
}
