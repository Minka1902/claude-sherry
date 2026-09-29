"use client";
import { useState } from "react";

const RESET_MS = 1500;

export default function CopyField({ label, value, className = "" }: { label?: string; value: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), RESET_MS);
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <span className="text-sm font-medium">{label}</span>}
      <div className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950">
        <code className="flex-1 truncate text-xs">{value}</code>
        <button type="button" onClick={copy} className="text-xs font-medium text-accent hover:underline">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
