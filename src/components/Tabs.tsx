import Link from "next/link";

export type TabItem = { key: string; label: string; href: string };

export default function Tabs({ items, active, className = "" }: { items: TabItem[]; active: string; className?: string }) {
  return (
    <nav className={`flex gap-1 border-b border-zinc-200 dark:border-zinc-800 ${className}`}>
      {items.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${t.key === active ? "border-accent text-accent" : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
