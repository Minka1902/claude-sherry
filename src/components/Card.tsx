import type { ReactNode } from "react";

export type CardProps = { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; className?: string; padded?: boolean; children?: ReactNode };

export default function Card({ title, subtitle, actions, className = "", padded = true, children }: CardProps) {
  return (
    <section className={`rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 ${padded ? "p-5" : ""} ${className}`}>
      {(title || actions) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="font-semibold">{title}</h2>}
            {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
