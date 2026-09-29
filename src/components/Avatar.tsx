import Image from "next/image";

export default function Avatar({ src, name, size = 40, className = "" }: { src?: string | null; name?: string | null; size?: number; className?: string }) {
  if (!src) {
    return (
      <span style={{ width: size, height: size }} className={`inline-flex items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold dark:bg-zinc-700 ${className}`}>
        {name?.[0]?.toUpperCase() ?? "?"}
      </span>
    );
  }
  return <Image src={src} alt={name ?? ""} width={size} height={size} className={`rounded-full ${className}`} />;
}
