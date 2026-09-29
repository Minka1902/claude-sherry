"use client";
import { useRouter } from "next/navigation";
import usePolling from "@/hooks/usePolling";

export default function AutoRefresh({ intervalMs = 5000, enabled = true }: { intervalMs?: number; enabled?: boolean }) {
  const router = useRouter();

  usePolling(router.refresh, intervalMs, enabled);

  return null;
}
