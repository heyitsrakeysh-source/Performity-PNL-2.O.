"use client";

/**
 * "Where your rupee goes" — replaces the donut in the concept sketch.
 *
 * A donut cannot carry seven parts legibly, and it hides the thing that
 * matters most here: whether the costs fit inside the revenue. A single
 * normalised track does both — every segment is directly labelled (which is
 * also the relief the amber slot's sub-3:1 contrast requires), and the
 * revenue marker shows the exact point where spending overtook income.
 */

import { useState } from "react";
import type { MonthFigures } from "@/lib/data/model";
import { costBreakdown } from "@/lib/data/model";
import { money, pct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useMeasure } from "./primitives";

interface Segment {
  id: string;
  label: string;
  value: number;
  share: number;
  color: string;
}

function segmentsFor(m: MonthFigures): { segs: Segment[]; total: number } {
  const { parts } = costBreakdown(m);
  const segs = parts.map((p) => ({ id: p.id, label: p.label, value: p.value, share: p.share, color: p.color }));
  const total = segs.reduce((s, x) => s + x.share, 0);
  return { segs, total };
}

function Track({
  m,
  label,
  height,
  showLabels,
  hovered,
  onHover,
}: {
  m: MonthFigures;
  label: string;
  height: number;
  showLabels: boolean;
  hovered: string | null;
  onHover: (id: string | null) => void;
}) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const { segs, total } = segmentsFor(m);
  const scale = 100 / Math.max(100, total);
  const GAP = 2;

  return (
    <div className="flex items-center gap-3">
      <span className="w-[74px] shrink-0 text-[11.5px] font-medium text-ink-3">{label}</span>
      <div ref={ref} className="relative flex-1" style={{ height }}>
        {width > 0 ? (
          <svg width={width} height={height} role="img" aria-label={`${label}: cost composition per ₹100 of revenue`}>
            {(() => {
              let x = 0;
              const nodes = segs.map((s, i) => {
                const w = Math.max(0, (s.share * scale * width) / 100 - GAP);
                const node = (
                  <g
                    key={s.id}
                    onMouseEnter={() => onHover(s.id)}
                    onMouseLeave={() => onHover(null)}
                    style={{
                      opacity: hovered && hovered !== s.id ? 0.3 : 1,
                      transition: "opacity 150ms",
                    }}
                  >
                    <rect
                      x={x}
                      y={0}
                      width={w}
                      height={height}
                      rx={i === 0 || i === segs.length - 1 ? 4 : 2}
                      fill={s.color}
                      className="grow-x cursor-pointer"
                      style={{ transformOrigin: "left center", animationDelay: `${i * 45}ms` }}
                    />
                    {showLabels && w > 38 ? (
                      <text
                        x={x + w / 2}
                        y={height / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={10.5}
                        fontWeight={700}
                        fill="#fff"
                        className="tnum pointer-events-none"
                      >
                        {s.share.toFixed(1)}%
                      </text>
                    ) : null}
                    <title>{`${s.label}: ${money(s.value)} (${pct(s.share)})`}</title>
                  </g>
                );
                x += (s.share * scale * width) / 100;
                return node;
              });
              return nodes;
            })()}

            {/* revenue marker — everything to its right was spent beyond income */}
            {total > 100 ? (
              <g>
                <line
                  x1={(100 * scale * width) / 100}
                  x2={(100 * scale * width) / 100}
                  y1={-3}
                  y2={height + 3}
                  stroke="var(--ink)"
                  strokeWidth={2}
                />
              </g>
            ) : null}
          </svg>
        ) : null}
      </div>
      <span
        className={cn(
          "tnum w-[62px] shrink-0 text-right text-[11.5px] font-bold",
          m.netProfit >= 0 ? "text-good-ink" : "text-critical-ink",
        )}
      >
        {pct(m.netMarginPct, 1)}
      </span>
    </div>
  );
}

export function RupeeRuler({ current, previous }: { current: MonthFigures; previous: MonthFigures }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const { segs, total } = segmentsFor(current);
  const prevMap = new Map(segmentsFor(previous).segs.map((s) => [s.id, s]));

  return (
    <div>
      <div className="space-y-2.5">
        <Track m={current} label="This month" height={30} showLabels hovered={hovered} onHover={setHovered} />
        <Track m={previous} label="Last month" height={16} showLabels={false} hovered={hovered} onHover={setHovered} />
      </div>

      {total > 100 ? (
        <p className="mt-3 flex items-center gap-1.5 rounded-md bg-critical-soft px-2.5 py-1.5 text-[11.5px] font-medium text-critical-ink">
          <span className="inline-block h-3 w-0.5 rounded-full bg-critical" aria-hidden />
          Costs run to {pct(total)} of revenue — {pct(total - 100)} past the line.
        </p>
      ) : null}

      {/* ranked breakdown: the table twin lives inline, so no value is
          reachable only by hovering the bar */}
      <ul className="mt-4 divide-y divide-line-soft">
        {[...segs]
          .sort((a, b) => b.value - a.value)
          .map((s) => {
            const prev = prevMap.get(s.id);
            const shift = prev ? s.share - prev.share : 0;
            return (
              <li
                key={s.id}
                onMouseEnter={() => setHovered(s.id)}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  "flex items-center gap-2.5 py-[7px] transition-colors",
                  hovered === s.id && "bg-surface-2",
                )}
              >
                <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-2">{s.label}</span>
                <span className="tnum shrink-0 text-[12.5px] font-semibold text-ink">{money(s.value)}</span>
                <span className="tnum w-[52px] shrink-0 text-right text-[12px] text-ink-3">{pct(s.share)}</span>
                <span
                  className={cn(
                    "tnum w-[52px] shrink-0 text-right text-[11.5px] font-medium",
                    Math.abs(shift) < 0.05 ? "text-ink-4" : shift > 0 ? "text-critical-ink" : "text-good-ink",
                  )}
                >
                  {Math.abs(shift) < 0.05 ? "—" : `${shift > 0 ? "+" : "−"}${Math.abs(shift).toFixed(1)}pp`}
                </span>
              </li>
            );
          })}
        <li className="flex items-center gap-2.5 border-t-2 border-line pt-2.5 pb-1">
          <span
            className="size-2.5 shrink-0 rounded-[3px]"
            style={{ background: current.netProfit >= 0 ? "var(--good)" : "var(--critical)" }}
            aria-hidden
          />
          <span className="min-w-0 flex-1 text-[12.5px] font-semibold text-ink">Net profit</span>
          <span
            className={cn(
              "tnum shrink-0 text-[12.5px] font-bold",
              current.netProfit >= 0 ? "text-good-ink" : "text-critical-ink",
            )}
          >
            {money(current.netProfit)}
          </span>
          <span className="tnum w-[52px] shrink-0 text-right text-[12px] font-semibold text-ink-2">
            {pct(current.netMarginPct, 1)}
          </span>
          <span className="w-[52px] shrink-0" />
        </li>
      </ul>
    </div>
  );
}
