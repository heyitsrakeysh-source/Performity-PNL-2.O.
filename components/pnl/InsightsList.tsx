"use client";

import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { Insight } from "@/lib/data/derived";
import { cn } from "@/lib/cn";

export function InsightsList({ insights, href = "/story" }: { insights: Insight[]; href?: string }) {
  return (
    <ul className="stagger space-y-2">
      {insights.map((i, idx) => {
        const Icon = i.tone === "good" ? TrendingUp : i.tone === "bad" ? TrendingDown : Minus;
        return (
          <li key={i.id} style={{ ["--i" as string]: idx }}>
            <Link
              href={href}
              className="group flex gap-3 rounded-lg border border-line bg-surface-2 p-3 transition-[background-color,border-color,transform] duration-200 hover:-translate-y-px hover:border-line-strong hover:bg-surface"
            >
              <span
                className={cn(
                  "mt-0.5 grid size-7 shrink-0 place-items-center rounded-md",
                  i.tone === "good" ? "bg-good-soft text-good-ink" : i.tone === "bad" ? "bg-critical-soft text-critical-ink" : "bg-surface-3 text-ink-3",
                )}
              >
                <Icon size={14} strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-semibold text-ink">{i.headline}</span>
                <span className="mt-1 block text-[11.5px] leading-relaxed text-ink-3">{i.body}</span>
              </span>
              <ArrowRight
                size={14}
                className="mt-1 shrink-0 -translate-x-1 text-ink-4 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
