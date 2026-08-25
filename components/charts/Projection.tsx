"use client";

/**
 * Month-to-date pacing with a projection to close.
 *
 * The dashed stroke and the shaded band are the only dashed/soft marks in the
 * system, and they mean something specific: "modelled, not observed".
 */

import { useState } from "react";
import type { DayPoint } from "@/lib/data/derived";
import { axisMoney, money } from "@/lib/format";
import {
  ChartTooltip,
  GridLines,
  linePath,
  linearScale,
  niceScale,
  useMeasure,
  useTooltip,
} from "./primitives";

export function ProjectionChart({
  series,
  today,
  height = 260,
  comparison,
}: {
  series: DayPoint[];
  today: number;
  height?: number;
  /** Last month's cumulative curve over the same day range. */
  comparison?: number[];
}) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const { tip, show, hide } = useTooltip();
  const [hover, setHover] = useState<number | null>(null);

  const M = { top: 16, right: 74, bottom: 26, left: 50 };
  const plotH = height - M.top - M.bottom;
  const innerW = Math.max(0, width - M.left - M.right);

  const values = [
    ...series.map((d) => d.cumulative),
    ...series.map((d) => d.low ?? d.cumulative),
    ...series.map((d) => d.high ?? d.cumulative),
    ...(comparison ?? []),
    0,
  ];
  const axis = niceScale(Math.min(...values), Math.max(...values), 3);
  const y = linearScale([axis.min, axis.max], [M.top + plotH, M.top]);
  const x = (day: number) => M.left + ((day - 1) / (series.length - 1)) * innerW;

  const actual = series.filter((d) => !d.isProjected);
  const projected = series.filter((d) => d.day >= today);

  const actualPts = actual.map((d) => [x(d.day), y(d.cumulative)] as [number, number]);
  const projPts = projected.map((d) => [x(d.day), y(d.cumulative)] as [number, number]);
  const bandTop = projected.map((d) => [x(d.day), y(d.high ?? d.cumulative)] as [number, number]);
  const bandBottom = [...projected].reverse().map((d) => [x(d.day), y(d.low ?? d.cumulative)] as [number, number]);
  const bandPath = `${linePath(bandTop)}L${bandBottom.map((p) => `${p[0]},${p[1]}`).join("L")}Z`;

  const last = series[series.length - 1];
  const mtd = series[today - 1];

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 ? (
        <svg width={width} height={height} role="img" aria-label="Cumulative net profit month to date with projection to month end">
          <GridLines ticks={axis.ticks} scale={y} x0={M.left} x1={width - M.right} format={axisMoney} zeroAt={0} />

          {/* break-even reference */}
          <text x={width - M.right + 6} y={y(0)} dominantBaseline="middle" fontSize={10} fill="var(--ink-4)">
            break-even
          </text>

          {/* last month, same period */}
          {comparison ? (
            <path
              d={linePath(comparison.map((v, i) => [x(i + 1), y(v)] as [number, number]))}
              fill="none"
              stroke="var(--ink-4)"
              strokeWidth={1.5}
              strokeOpacity={0.55}
            />
          ) : null}

          {/* confidence band */}
          <path d={bandPath} fill="var(--brand)" opacity={0.12} />

          {/* actual */}
          <path
            d={linePath(actualPts)}
            fill="none"
            stroke="var(--brand)"
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="draw-in"
            style={{ ["--len" as string]: "1400" }}
          />
          {/* projection */}
          <path
            d={linePath(projPts)}
            fill="none"
            stroke="var(--brand)"
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeLinecap="round"
            opacity={0.85}
          />

          {/* today marker */}
          <line
            x1={x(today)}
            x2={x(today)}
            y1={M.top}
            y2={M.top + plotH}
            stroke="var(--line-strong)"
            strokeWidth={1}
            shapeRendering="crispEdges"
          />
          <text x={x(today)} y={M.top - 5} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="var(--ink-3)">
            TODAY
          </text>

          {/* endpoints, direct-labelled */}
          <circle cx={x(mtd.day)} cy={y(mtd.cumulative)} r={4.5} fill="var(--surface)" stroke="var(--brand)" strokeWidth={2.5} />
          <circle cx={x(last.day)} cy={y(last.cumulative)} r={4.5} fill="var(--brand)" stroke="var(--surface)" strokeWidth={2} />
          <text
            x={Math.min(x(last.day) + 8, width - 4)}
            y={y(last.cumulative) - 8}
            textAnchor="end"
            fontSize={11}
            fontWeight={700}
            fill={last.cumulative >= 0 ? "var(--good-ink)" : "var(--critical-ink)"}
            className="tnum"
          >
            {money(last.cumulative)}
          </text>

          {/* x labels every 3 days */}
          {series
            .filter((d) => d.day === 1 || d.day % 5 === 0 || d.day === series.length)
            .map((d) => (
              <text
                key={d.day}
                x={x(d.day)}
                y={height - 8}
                textAnchor="middle"
                fontSize={10}
                fill="var(--ink-4)"
                className="tnum"
              >
                {d.day}
              </text>
            ))}

          {/* crosshair hover */}
          {hover !== null ? (
            <line
              x1={x(hover + 1)}
              x2={x(hover + 1)}
              y1={M.top}
              y2={M.top + plotH}
              stroke="var(--brand)"
              strokeWidth={1}
              strokeOpacity={0.5}
            />
          ) : null}

          <rect
            x={M.left}
            y={M.top}
            width={innerW}
            height={plotH}
            fill="transparent"
            className="cursor-crosshair"
            onMouseMove={(e) => {
              const svg = e.currentTarget.ownerSVGElement as SVGSVGElement;
              const rect = svg.getBoundingClientRect();
              const px = e.clientX - rect.left;
              const idx = Math.round(((px - M.left) / innerW) * (series.length - 1));
              const i = Math.max(0, Math.min(series.length - 1, idx));
              setHover(i);
              const d = series[i];
              show({
                x: px,
                y: 8,
                title: `Day ${d.day}`,
                rows: [
                  { label: "Cumulative", value: money(d.cumulative), strong: true, color: "var(--brand)" },
                  { label: "That day", value: money(d.daily) },
                  { label: "Orders", value: d.orders.toLocaleString("en-IN") },
                ],
                note: d.isProjected
                  ? `Projected · band ±${money(Math.abs((d.high ?? 0) - d.cumulative))}`
                  : "Actual",
              });
            }}
            onMouseLeave={() => {
              setHover(null);
              hide();
            }}
          />
        </svg>
      ) : null}
      <ChartTooltip tip={tip} containerWidth={width} />
    </div>
  );
}
