"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import { changePct, direction, pctDelta, ppDelta, tone } from "@/lib/format";

/**
 * A signed movement badge. `higherIsBetter=false` inverts the colour so a
 * rising CAC reads as bad while still pointing up, direction and judgement
 * are encoded separately, never collapsed into one channel.
 */
export function Delta({
  current,
  previous,
  higherIsBetter = true,
  mode = "pct",
  suffix,
  size = "md",
  className,
  showArrow = true,
}: {
  current: number;
  previous: number;
  higherIsBetter?: boolean;
  /** "pct" = relative change, "pp" = absolute difference in percentage points. */
  mode?: "pct" | "pp";
  suffix?: string;
  size?: "sm" | "md";
  className?: string;
  showArrow?: boolean;
}) {
  const delta = mode === "pp" ? current - previous : changePct(current, previous);
  if (delta === null) return null;

  const dir = direction(delta);
  const t = tone(delta, higherIsBetter);
  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;
  const text = mode === "pp" ? ppDelta(delta) : pctDelta(delta);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full font-semibold tabular-nums",
        size === "sm" ? "px-1.5 py-0.5 text-[10.5px]" : "px-2 py-[3px] text-[11.5px]",
        t === "good" && "bg-good-soft text-good-ink",
        t === "bad" && "bg-critical-soft text-critical-ink",
        t === "neutral" && "bg-surface-3 text-ink-3",
        className,
      )}
    >
      {showArrow ? <Icon size={size === "sm" ? 11 : 12} strokeWidth={2.5} aria-hidden /> : null}
      {text}
      {suffix ? <span className="font-medium opacity-70">{suffix}</span> : null}
    </span>
  );
}

/** A plain coloured value. Used inside dense tables where a pill is too loud. */
export function DeltaText({
  value,
  higherIsBetter = true,
  mode = "pct",
  className,
}: {
  value: number | null;
  higherIsBetter?: boolean;
  mode?: "pct" | "pp";
  className?: string;
}) {
  if (value === null) return <span className="text-ink-4">-</span>;
  const t = tone(value, higherIsBetter);
  const dir = direction(value);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 tabular-nums",
        t === "good" && "text-good-ink",
        t === "bad" && "text-critical-ink",
        t === "neutral" && "text-ink-3",
        className,
      )}
    >
      {dir === "up" ? "▲" : dir === "down" ? "▼" : "-"}
      {mode === "pp" ? ppDelta(value) : pctDelta(value)}
    </span>
  );
}
