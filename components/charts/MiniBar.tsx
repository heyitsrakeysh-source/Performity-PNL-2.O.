"use client";

import { cn } from "@/lib/cn";

/**
 * Inline magnitude bar for table rows. One colour for every row — length is
 * already carrying the magnitude, so hue stays free.
 */
export function MiniBar({
  value,
  max,
  tone = "brand",
  width = 56,
  className,
}: {
  value: number;
  max: number;
  tone?: "brand" | "good" | "critical" | "muted";
  width?: number;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, (Math.abs(value) / max) * 100) : 0;
  const color =
    tone === "good" ? "var(--good)" : tone === "critical" ? "var(--critical)" : tone === "muted" ? "var(--ink-4)" : "var(--brand)";
  return (
    <span
      className={cn("inline-block overflow-hidden rounded-full bg-surface-3 align-middle", className)}
      style={{ width, height: 4 }}
      aria-hidden
    >
      <span
        className="block h-full rounded-full"
        style={{ width: `${pct}%`, background: color, transition: "width 500ms cubic-bezier(0.16,1,0.3,1)" }}
      />
    </span>
  );
}
