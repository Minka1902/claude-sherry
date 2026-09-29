"use client";
import { useState } from "react";

const SIZES = { sm: "text-sm", md: "text-lg", lg: "text-2xl" };

export type StarRatingProps = {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  name?: string;
  max?: number;
  size?: keyof typeof SIZES;
  readOnly?: boolean;
  label?: string;
  showValue?: boolean;
  count?: number;
  className?: string;
};

function fill(i: number, value: number) {
  return Math.max(0, Math.min(1, value - i)) * 100;
}

export default function StarRating({ value, defaultValue = 0, onChange, name, max = 5, size = "md", readOnly, label, showValue, count, className = "" }: StarRatingProps) {
  const [inner, setInner] = useState(defaultValue);
  const [hover, setHover] = useState<number | null>(null);
  const current = value ?? inner;
  const shown = hover ?? current;

  function select(v: number) {
    if (readOnly) return;
    setInner(v);
    onChange?.(v);
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {label && <span className="text-sm text-zinc-500">{label}</span>}
      <div className={`inline-flex leading-none ${SIZES[size]}`} onMouseLeave={() => setHover(null)} role={readOnly ? "img" : "radiogroup"} aria-label={`${current.toFixed(1)} of ${max}`}>
        {Array.from({ length: max }, (_, i) => (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            onClick={() => select(i + 1)}
            onMouseEnter={() => !readOnly && setHover(i + 1)}
            className={`relative ${readOnly ? "cursor-default" : "cursor-pointer"}`}
            aria-label={`${i + 1} star`}
          >
            <span className="text-zinc-300 dark:text-zinc-700">★</span>
            <span className="absolute inset-0 overflow-hidden text-amber-400" style={{ width: `${fill(i, shown)}%` }}>
              ★
            </span>
          </button>
        ))}
      </div>
      {showValue && <span className="text-sm font-medium">{current ? current.toFixed(1) : "—"}</span>}
      {count !== undefined && <span className="text-sm text-zinc-500">({count})</span>}
      {name && <input type="hidden" name={name} value={current || ""} />}
    </div>
  );
}
