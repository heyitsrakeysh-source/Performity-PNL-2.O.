"use client";

/**
 * The sentence under a chart.
 *
 * A chart shows a shape; this says what the shape means, in the reader's own
 * numbers. Every string is computed from the live model, so it stays correct
 * when a filter, brand or input changes.
 */

import { useState } from "react";
import { ChevronDown, Lightbulb, TrendingDown, TrendingUp } from "lucide-react";
import type { Insight } from "@/lib/data/insights";
import { cn } from "@/lib/cn";

export function ChartInsight({ insight, className }: { insight: Insight; className?: string }) {
  const [open, setOpen] = useState(false);
  const Icon = insight.tone === "good" ? TrendingUp : insight.tone === "bad" ? TrendingDown : Lightbulb;

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5 transition-colors",
        insight.tone === "good" && "border-good/20 bg-good-soft",
        insight.tone === "bad" && "border-critical/20 bg-critical-soft",
        insight.tone === "neutral" && "border-line bg-surface-2",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Icon
          size={14}
          strokeWidth={2.3}
          className={cn(
            "mt-px shrink-0",
            insight.tone === "good" && "text-good-ink",
            insight.tone === "bad" && "text-critical-ink",
            insight.tone === "neutral" && "text-ink-3",
          )}
        />
        <p
          className={cn(
            "min-w-0 flex-1 text-[12px] leading-relaxed font-medium",
            insight.tone === "good" && "text-good-ink",
            insight.tone === "bad" && "text-critical-ink",
            insight.tone === "neutral" && "text-ink-2",
          )}
        >
          {insight.text}
        </p>
        {insight.detail ? (
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={cn(
              "shrink-0 rounded p-0.5 transition-colors",
              insight.tone === "good" && "text-good-ink/70 hover:text-good-ink",
              insight.tone === "bad" && "text-critical-ink/70 hover:text-critical-ink",
              insight.tone === "neutral" && "text-ink-4 hover:text-ink-2",
            )}
          >
            <span className="sr-only">{open ? "Hide detail" : "Show detail"}</span>
            <ChevronDown size={14} className={cn("transition-transform duration-200", open && "rotate-180")} />
          </button>
        ) : null}
      </div>

      {open && insight.detail ? (
        <p
          className={cn(
            "anim-fade-in mt-2 border-t pt-2 pl-[22px] text-[11.5px] leading-relaxed",
            insight.tone === "good" && "border-good/15 text-good-ink/85",
            insight.tone === "bad" && "border-critical/15 text-critical-ink/85",
            insight.tone === "neutral" && "border-line text-ink-3",
          )}
        >
          {insight.detail}
        </p>
      ) : null}
    </div>
  );
}
