"use client";
import { useEffect, useRef } from "react";

/** Calls `callback` every `intervalMs` while enabled and the tab is visible. */
export default function usePolling(callback: () => void, intervalMs: number, enabled = true) {
  const saved = useRef(callback);

  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => document.visibilityState === "visible" && saved.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
