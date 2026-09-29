"use client";

const FORMAT: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };

export default function LocalTime({ value, options = FORMAT, className }: { value: string | Date; options?: Intl.DateTimeFormatOptions; className?: string }) {
  const date = new Date(value);

  return (
    <time dateTime={date.toISOString()} className={className} suppressHydrationWarning>
      {date.toLocaleString(undefined, options)}
    </time>
  );
}
