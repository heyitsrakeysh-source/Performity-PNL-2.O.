"use client";

/**
 * Quarterly revenue against net profit. Two panels sharing an x-axis, for the
 * same reason the monthly view uses two: money and its remainder need very
 * different scales to be readable.
 */

import { useState } from "react";
import type { QuarterFigures } from "@/lib/data/model";
import { axisMoney, money, moneyCompact, pct } from "@/lib/format";
import {
  barPath,
  ChartTooltip,
  GridLines,
  Legend,
  linearScale,
  niceScale,
  useMeasure,
  useTooltip,
  XLabels,
} from "./primitives";

export function QuarterBars({ quarters, height = 260 }: { quarters: QuarterFigures[]; height?: number }) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const { tip, show, hide } = useTooltip();
  const [hover, setHover] = useState<number | null>(null);

  const M = { top: 22, right: 12, bottom: 22, left: 50 };
  const GAP = 30;
  const topH = Math.round((height - GAP - M.top - M.bottom) * 0.6);
  const botH = height - GAP - M.top - M.bottom - topH;

  const innerW = Math.max(0, width - M.left - M.right);
  const band = quarters.length ? innerW / quarters.length : 0;
  const barW = Math.min(56, Math.max(14, band * 0.44));

  const revAxis = niceScale(0, Math.max(...quarters.map((q) => q.totalRevenue), 1), 3);
  const yRev = linearScale([revAxis.min, revAxis.max], [M.top + topH, M.top]);

  const np = quarters.map((q) => q.netProfit);
  const npAxis = niceScale(Math.min(...np, 0), Math.max(...np, 0), 2);
  const botTop = M.top + topH + GAP;
  const yNp = linearScale([npAxis.min, npAxis.max], [botTop + botH, botTop]);
  const zero = yNp(0);

  return (
    <div>
      <Legend
        className="mb-3"
        items={[
          { label: "Revenue", color: "var(--brand)", shape: "square" },
          { label: "Cost of goods", color: "var(--series-1)", shape: "square" },
          { label: "Net profit", color: "var(--series-3)", shape: "square" },
        ]}
      />
      <div ref={ref} className="relative w-full" style={{ height }}>
        {width > 0 && quarters.length > 0 ? (
          <svg width={width} height={height} role="img" aria-label="Revenue and net profit by quarter">
            <text x={M.left} y={M.top - 10} fontSize={10} fontWeight={700} fill="var(--ink-4)" letterSpacing="0.05em">
              REVENUE
            </text>
            <GridLines ticks={revAxis.ticks} scale={yRev} x0={M.left} x1={width - M.right} format={axisMoney} />

            {quarters.map((q, i) => {
              const cx = M.left + band * i + band / 2;
              const dim = hover !== null && hover !== i;
              const yTop = yRev(q.totalRevenue);
              const yCogs = yRev(q.cogs);
              return (
                <g key={q.key} style={{ opacity: dim ? 0.35 : 1, transition: "opacity 150ms" }}>
                  <path
                    d={barPath(cx - barW / 2, yTop, barW, M.top + topH - yTop, 4, "top")}
                    fill="var(--brand)"
                    className="grow-y"
                    style={{ transformOrigin: `${cx}px ${M.top + topH}px`, animationDelay: `${i * 45}ms` }}
                  />
                  <path
                    d={barPath(cx - barW / 2, yCogs, barW, M.top + topH - yCogs, 4, "top")}
                    fill="var(--series-1)"
                    opacity={0.85}
                    className="grow-y"
                    style={{ transformOrigin: `${cx}px ${M.top + topH}px`, animationDelay: `${i * 45}ms` }}
                  />
                  {q.partial ? (
                    <text x={cx} y={yTop - 6} textAnchor="middle" fontSize={9.5} fill="var(--ink-4)">
                      partial
                    </text>
                  ) : null}
                </g>
              );
            })}

            <text x={M.left} y={botTop - 10} fontSize={10} fontWeight={700} fill="var(--ink-4)" letterSpacing="0.05em">
              NET PROFIT
            </text>
            <GridLines ticks={npAxis.ticks} scale={yNp} x0={M.left} x1={width - M.right} format={axisMoney} zeroAt={0} />

            {quarters.map((q, i) => {
              const cx = M.left + band * i + band / 2;
              const y = yNp(q.netProfit);
              const positive = q.netProfit >= 0;
              const dim = hover !== null && hover !== i;
              return (
                <path
                  key={`np-${q.key}`}
                  d={barPath(cx - barW / 2, positive ? y : zero, barW, Math.max(Math.abs(zero - y), 2), 3, positive ? "top" : "bottom")}
                  fill={positive ? "var(--series-3)" : "var(--critical)"}
                  className="grow-y"
                  style={{ opacity: dim ? 0.35 : 1, transformOrigin: `${cx}px ${zero}px`, animationDelay: `${i * 45}ms` }}
                />
              );
            })}

            <XLabels
              labels={quarters.map((q) => q.shortLabel)}
              band={band}
              y={height - 4}
              x0={M.left}
              highlight={quarters.length - 1}
            />

            {quarters.map((q, i) => (
              <rect
                key={`hit-${q.key}`}
                x={M.left + band * i}
                y={M.top}
                width={band}
                height={height - M.top - 6}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${q.label}: revenue ${money(q.totalRevenue)}, net profit ${money(q.netProfit)}`}
                className="cursor-crosshair outline-none"
                onMouseEnter={(e) => {
                  setHover(i);
                  const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  show({
                    x: e.clientX - rect.left,
                    y: 6,
                    title: `${q.label}${q.partial ? " (partial)" : ""}`,
                    rows: [
                      { label: "Revenue", value: moneyCompact(q.totalRevenue), color: "var(--brand)" },
                      { label: "COGS", value: moneyCompact(q.cogs), color: "var(--series-1)" },
                      { label: "Marketing", value: moneyCompact(q.totalMarketing) },
                      { label: "Net profit", value: moneyCompact(q.netProfit), strong: true },
                    ],
                    note: `${pct(q.netMarginPct, 2)} margin · CAC ${money(q.cac)} · ${q.months.length} month${q.months.length === 1 ? "" : "s"}`,
                  });
                }}
                onFocus={() => setHover(i)}
                onMouseLeave={() => {
                  setHover(null);
                  hide();
                }}
                onBlur={() => setHover(null)}
              />
            ))}
          </svg>
        ) : null}
        <ChartTooltip tip={tip} containerWidth={width} />
      </div>
    </div>
  );
}
