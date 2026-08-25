"use client";

/**
 * Twelve-month profitability. Net profit (₹) and net margin (%) are different
 * units, so they get their own panels stacked on a shared x-axis rather than
 * two y-scales on one plot.
 */

import { useState } from "react";
import type { MonthFigures } from "@/lib/data/model";
import { axisMoney, money, moneyCompact, pct } from "@/lib/format";
import {
  barPath,
  ChartTooltip,
  GridLines,
  linearScale,
  niceScale,
  smoothPath,
  useMeasure,
  useTooltip,
  XLabels,
} from "./primitives";

export function TrendPanels({ months, height = 268 }: { months: MonthFigures[]; height?: number }) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const { tip, show, hide } = useTooltip();
  const [hover, setHover] = useState<number | null>(null);

  const M = { top: 12, right: 12, bottom: 20, left: 48 };
  const GAP = 18;
  const topH = Math.round((height - GAP - M.top - M.bottom) * 0.62);
  const botH = height - GAP - M.top - M.bottom - topH;

  const innerW = Math.max(0, width - M.left - M.right);
  const band = months.length ? innerW / months.length : 0;
  const barW = Math.min(30, Math.max(7, band * 0.5));

  const np = months.map((m) => m.netProfit);
  const npAxis = niceScale(Math.min(...np, 0), Math.max(...np, 0), 3);
  const yTop = linearScale([npAxis.min, npAxis.max], [M.top + topH, M.top]);
  const zeroY = yTop(0);

  const nm = months.map((m) => m.netMarginPct);
  const nmAxis = niceScale(Math.min(...nm, 0), Math.max(...nm, 0), 2);
  const botTop = M.top + topH + GAP;
  const yBot = linearScale([nmAxis.min, nmAxis.max], [botTop + botH, botTop]);

  const marginPts = months.map(
    (m, i) => [M.left + band * i + band / 2, yBot(m.netMarginPct)] as [number, number],
  );

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 ? (
        <svg width={width} height={height} role="img" aria-label="Net profit and net margin over twelve months">
          {/* profitable / loss-making zones behind the profit panel */}
          <rect
            x={M.left}
            y={M.top}
            width={innerW}
            height={Math.max(0, zeroY - M.top)}
            fill="var(--good)"
            opacity={0.05}
          />
          <rect
            x={M.left}
            y={zeroY}
            width={innerW}
            height={Math.max(0, M.top + topH - zeroY)}
            fill="var(--critical)"
            opacity={0.06}
          />

          <GridLines ticks={npAxis.ticks} scale={yTop} x0={M.left} x1={width - M.right} format={axisMoney} zeroAt={0} />

          {months.map((m, i) => {
            const cx = M.left + band * i + band / 2;
            const x = cx - barW / 2;
            const yv = yTop(m.netProfit);
            const positive = m.netProfit >= 0;
            const h = Math.max(Math.abs(zeroY - yv), 2);
            const dim = hover !== null && hover !== i;
            return (
              <path
                key={m.key}
                d={barPath(x, positive ? yv : zeroY, barW, h, 3, positive ? "top" : "bottom")}
                fill={positive ? "var(--brand)" : "var(--critical)"}
                className="grow-y"
                style={{
                  opacity: dim ? 0.32 : 1,
                  transition: "opacity 150ms",
                  transformOrigin: `${cx}px ${zeroY}px`,
                  animationDelay: `${i * 28}ms`,
                }}
              />
            );
          })}

          {/* margin panel */}
          <GridLines
            ticks={nmAxis.ticks}
            scale={yBot}
            x0={M.left}
            x1={width - M.right}
            format={(v) => `${v.toFixed(0)}%`}
            zeroAt={0}
          />
          <path
            d={smoothPath(marginPts)}
            fill="none"
            stroke="var(--series-3)"
            strokeWidth={2}
            strokeLinecap="round"
            className="draw-in"
            style={{ ["--len" as string]: "1600" }}
          />
          {marginPts.map((p, i) => {
            const isLast = i === marginPts.length - 1;
            const active = hover === i || isLast;
            return (
              <circle
                key={i}
                cx={p[0]}
                cy={p[1]}
                r={active ? 4 : 2.6}
                fill={isLast ? "var(--series-3)" : "var(--surface)"}
                stroke="var(--series-3)"
                strokeWidth={2}
                style={{ transition: "r 140ms" }}
              />
            );
          })}
          {/* direct label on the endpoint only */}
          <text
            x={marginPts[marginPts.length - 1][0] - 6}
            y={marginPts[marginPts.length - 1][1] - 9}
            textAnchor="end"
            fontSize={10.5}
            fontWeight={700}
            fill="var(--series-3)"
            className="tnum"
          >
            {pct(months[months.length - 1].netMarginPct, 1)}
          </text>

          <XLabels
            labels={months.map((m) => m.shortLabel)}
            band={band}
            y={height - 4}
            x0={M.left}
            highlight={months.length - 1}
          />

          {months.map((m, i) => (
            <rect
              key={`hit-${m.key}`}
              x={M.left + band * i}
              y={M.top}
              width={band}
              height={height - M.top - 8}
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={`${m.label}: net profit ${money(m.netProfit)}, margin ${pct(m.netMarginPct, 1)}`}
              className="cursor-crosshair outline-none"
              onMouseEnter={(e) => {
                setHover(i);
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                show({
                  x: e.clientX - rect.left,
                  y: 6,
                  title: m.label,
                  rows: [
                    { label: "Net profit", value: moneyCompact(m.netProfit), strong: true },
                    { label: "Net margin", value: pct(m.netMarginPct, 2), color: "var(--series-3)" },
                    { label: "Revenue", value: moneyCompact(m.totalRevenue) },
                    { label: "CAC", value: `₹${Math.round(m.cac)}` },
                  ],
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
  );
}
