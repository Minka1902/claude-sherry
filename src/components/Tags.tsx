import Link from "next/link";
import Badge, { type BadgeTone } from "@/components/Badge";

export default function Tags({ tags, tone = "neutral", hrefFor, className = "" }: { tags: string[]; tone?: BadgeTone; hrefFor?: (tag: string) => string; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {tags.map((t) =>
        hrefFor ? (
          <Link key={t} href={hrefFor(t)}>
            <Badge tone={tone}>{t}</Badge>
          </Link>
        ) : (
          <Badge key={t} tone={tone}>
            {t}
          </Badge>
        ),
      )}
    </div>
  );
}
