"use client";

/**
 * "Performance over time" — the sketch put revenue/cost bars and a net-profit
 * line on two different y-scales. Two scales on one plot invent a correlation
 * that isn't in the data, so this is drawn as two stacked panels sharing one
 * x-axis instead: cost composition against a revenue reference on top, net
 * profit around its own zero baseline below.
 */

import { useState } from "react";
import type { MonthFigures } from "@/lib/data/model";
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
  type LegendItem,
} from "./primitives";

const STACK = [
  { id: "cogs", label: "COGS", color: "var(--series-1)", get: (m: MonthFigures) => m.cogs },
  { id: "ops", label: "Operations", color: "var(--series-3)", get: (m: MonthFigures) => m.totalOperationalCosts },
  { id: "marketing", label: "Marketing", color: "var(--series-5)", get: (m: MonthFigures) => m.totalMarketing },
];

export function PerformancePanels({ months, height = 292 }: { months: MonthFigures[]; height?: number }) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const { tip, show, hide } = useTooltip();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [activeSeries, setActiveSeries] = useState<string | null>(null);

  const M = { top: 24, right: 12, bottom: 22, left: 46 };
  const GAP = 34; // between the two panels — enough that their axes never collide
  const XAXIS = 18;
  const topH = Math.round((height - GAP - XAXIS - M.top - M.bottom) * 0.68);
  const botH = height - GAP - XAXIS - M.top - M.bottom - topH;

  const innerW = Math.max(0, width - M.left - M.right);
  const band = months.length ? innerW / months.length : 0;
  const barW = Math.min(38, Math.max(8, band * 0.56));

  // --- scales ---------------------------------------------------------
  const topMax = Math.max(
    ...months.map((m) => Math.max(m.totalRevenue, m.cogs + m.totalOperationalCosts + m.totalMarketing)),
    1,
  );
  const topAxis = niceScale(0, topMax, 3);
  const yTop = linearScale([topAxis.min, topAxis.max], [M.top + topH, M.top]);

  const npValues = months.map((m) => m.netProfit);
  const botAxis = niceScale(Math.min(...npValues, 0), Math.max(...npValues, 0), 2);
  const botTop = M.top + topH + GAP;
  const yBot = linearScale([botAxis.min, botAxis.max], [botTop + botH, botTop]);

  const legend: LegendItem[] = [
    ...STACK.map((s) => ({ label: s.label, color: s.color, shape: "square" as const })),
    { label: "Revenue", color: "var(--ink-2)", shape: "line" as const },
    { label: "Net profit", color: "var(--brand)", shape: "square" as const },
  ];

  return (
    <div>
      <Legend items={legend} className="mb-3" onHover={setActiveSeries} activeLabel={activeSeries} />
      <div ref={ref} className="relative w-full" style={{ height }}>
        {width > 0 ? (
          <svg width={width} height={height} role="img" aria-label="Revenue, cost composition and net profit by month">
            {/* ---------- panel 1: costs against revenue ---------- */}
            <text x={M.left} y={M.top - 10} fontSize={10} fontWeight={700} fill="var(--ink-4)" letterSpacing="0.05em">
              REVENUE &amp; COSTS
            </text>
            <GridLines
              ticks={topAxis.ticks}
              scale={yTop}
              x0={M.left}
              x1={width - M.right}
              format={axisMoney}
            />

            {months.map((m, i) => {
              const cx = M.left + band * i + band / 2;
              const x = cx - barW / 2;
              let acc = 0;
              const dim = hoverIdx !== null && hoverIdx !== i;

              return (
                <g key={m.key} style={{ opacity: dim ? 0.35 : 1, transition: "opacity 150ms" }}>
                  {STACK.map((s, si) => {
                    const v = s.get(m);
                    const y0 = yTop(acc);
                    acc += v;
                    const y1 = yTop(acc);
                    const rawH = y0 - y1;
                    if (rawH < 1) return null;
                    const isTop = si === STACK.length - 1;
                    // 2px surface gap above each segment; the bottom segment
                    // stays anchored to the baseline.
                    const h = Math.max(1, rawH - (si === 0 ? 0 : 2));
                    const y = y1 + (si === 0 ? 0 : 2);
                    const faded = activeSeries != null && activeSeries !== s.label;
                    return (
                      <path
                        key={s.id}
                        d={barPath(x, y, barW, h, 4, isTop ? "top" : "none")}
                        fill={s.color}
                        style={{
                          opacity: faded ? 0.22 : 1,
                          transition: "opacity 150ms",
                          transformOrigin: `${cx}px ${M.top + topH}px`,
                        }}
                        className="grow-y"
                      />
                    );
                  })}

                  {/* revenue reference cap — same axis, neutral ink so it
                      reads as a threshold rather than another category */}
                  <line
                    x1={x - 3}
                    x2={x + barW + 3}
                    y1={yTop(m.totalRevenue)}
                    y2={yTop(m.totalRevenue)}
                    stroke="var(--ink-2)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    style={{ opacity: activeSeries && activeSeries !== "Revenue" ? 0.25 : 1 }}
                  />
                </g>
              );
            })}

            {/* ---------- panel 2: net profit ---------- */}
            <text x={M.left} y={botTop - 10} fontSize={10} fontWeight={700} fill="var(--ink-4)" letterSpacing="0.05em">
              NET PROFIT
            </text>
            <GridLines
              ticks={botAxis.ticks}
              scale={yBot}
              x0={M.left}
              x1={width - M.right}
              format={axisMoney}
              zeroAt={0}
            />

            {months.map((m, i) => {
              const cx = M.left + band * i + band / 2;
              const x = cx - barW / 2;
              const zero = yBot(0);
              const y = yBot(m.netProfit);
              const positive = m.netProfit >= 0;
              const h = Math.abs(zero - y);
              const dim = hoverIdx !== null && hoverIdx !== i;
              const faded = activeSeries != null && activeSeries !== "Net profit";
              return (
                <path
                  key={m.key}
                  d={barPath(x, positive ? y : zero, barW, Math.max(h, 1.5), 3, positive ? "top" : "bottom")}
                  fill={positive ? "var(--brand)" : "var(--critical)"}
                  style={{
                    opacity: dim || faded ? 0.3 : 1,
                    transition: "opacity 150ms",
                    transformOrigin: `${cx}px ${zero}px`,
                  }}
                  className="grow-y"
                />
              );
            })}

            {/* ---------- shared x axis ---------- */}
            <XLabels
              labels={months.map((m) => m.shortLabel)}
              band={band}
              y={height - 4}
              x0={M.left}
              highlight={months.length - 1}
            />

            {/* ---------- hover layer: full-height bands, generous targets --- */}
            {months.map((m, i) => (
              <rect
                key={`hit-${m.key}`}
                x={M.left + band * i}
                y={M.top}
                width={band}
                height={height - M.top - 6}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${m.label}: revenue ${money(m.totalRevenue)}, net profit ${money(m.netProfit)}`}
                onMouseEnter={(e) => {
                  setHoverIdx(i);
                  const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  show({
                    x: e.clientX - rect.left,
                    y: 8,
                    title: m.label,
                    rows: [
                      { label: "Revenue", value: moneyCompact(m.totalRevenue), color: "var(--ink-2)" },
                      ...STACK.map((s) => ({
                        label: s.label,
                        value: moneyCompact(s.get(m)),
                        color: s.color,
                      })),
                      { label: "Net profit", value: moneyCompact(m.netProfit), strong: true },
                    ],
                    note: `Net margin ${pct(m.netMarginPct, 2)} · ${m.orders.toLocaleString("en-IN")} orders`,
                  });
                }}
                onFocus={() => setHoverIdx(i)}
                onMouseLeave={() => {
                  setHoverIdx(null);
                  hide();
                }}
                onBlur={() => setHoverIdx(null)}
                className="cursor-crosshair outline-none focus-visible:fill-brand/5"
              />
            ))}
          </svg>
        ) : null}
        <ChartTooltip tip={tip} containerWidth={width} />
      </div>
    </div>
  );
}
