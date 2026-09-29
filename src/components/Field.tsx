import type { ReactNode } from "react";

export type FieldProps = { label?: ReactNode; hint?: ReactNode; error?: string; className?: string };

export const CONTROL_CLASS =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-900";

export default function Field({ label, hint, error, className = "", children }: FieldProps & { children: ReactNode }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      {label && <span className="text-sm font-medium">{label}</span>}
      {children}
      {error ? <span className="text-xs text-red-600">{error}</span> : hint && <span className="text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}
