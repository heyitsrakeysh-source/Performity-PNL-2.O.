"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Delta } from "@/components/ui/Delta";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Sparkline } from "@/components/charts/Sparkline";
import { InfoDot } from "@/components/ui/Card";

export function KpiCard({
  label,
  value,
  format,
  previous,
  series,
  higherIsBetter = true,
  deltaMode = "pct",
  info,
  footnote,
  color = "var(--brand)",
  href,
  emphasis = false,
  index = 0,
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  previous?: number;
  series?: number[];
  higherIsBetter?: boolean;
  deltaMode?: "pct" | "pp";
  info?: string;
  footnote?: ReactNode;
  color?: string;
  href?: string;
  emphasis?: boolean;
  index?: number;
}) {
  const negative = value < 0;

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink-3">
          {label}
          {info ? <InfoDot text={info} /> : null}
        </span>
        {href ? (
          <ArrowUpRight
            size={14}
            className="shrink-0 text-ink-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          />
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <AnimatedNumber
          value={value}
          format={format}
          className={cn(
            "figure-lg text-[24px] leading-none sm:text-[26px]",
            emphasis && negative ? "text-critical-ink" : emphasis ? "text-good-ink" : "text-ink",
          )}
        />
        {previous !== undefined ? (
          <Delta current={value} previous={previous} higherIsBetter={higherIsBetter} mode={deltaMode} size="sm" />
        ) : null}
      </div>

      {series && series.length > 1 ? (
        <div className="mt-3 -mb-0.5">
          <Sparkline values={series} color={color} height={36} />
        </div>
      ) : null}

      {footnote ? <p className="mt-2 text-[11.5px] leading-snug text-ink-4">{footnote}</p> : null}
    </>
  );

  const className = cn(
    "group relative flex flex-col rounded-lg border border-line bg-surface p-4 shadow-xs",
    "transition-[box-shadow,border-color,transform] duration-200",
    "hover:-translate-y-px hover:border-line-strong hover:shadow-md",
  );

  if (href) {
    return (
      <Link href={href} className={className} style={{ ["--i" as string]: index }}>
        {inner}
      </Link>
    );
  }
  return (
    <div className={className} style={{ ["--i" as string]: index }}>
      {inner}
    </div>
  );
}
