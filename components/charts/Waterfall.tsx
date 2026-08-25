"use client";

/**
 * Waterfall — used for the profit bridge (revenue → net profit) and for
 * driver attribution (last month's profit → this month's).
 *
 * Bars are diverging around a running total: contributions that add sit in
 * the positive pole, ones that subtract in the negative pole, with grey
 * anchors for the start and end totals.
 */

import { useState } from "react";
import { axisMoney, money, moneyCompact } from "@/lib/format";
import {
  barPath,
  ChartTooltip,
  GridLines,
  linearScale,
  niceScale,
  useMeasure,
  useTooltip,
} from "./primitives";

export interface WaterfallItem {
  label: string;
  value: number;
  /** "anchor" bars are absolute totals; the rest are deltas. */
  kind?: "anchor" | "delta";
  detail?: string;
}

export function Waterfall({
  items,
  height = 240,
  labelLines = 2,
}: {
  items: WaterfallItem[];
  height?: number;
  labelLines?: number;
}) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const { tip, show, hide } = useTooltip();
  const [hover, setHover] = useState<number | null>(null);

  const labelH = labelLines * 13 + 8;
  const M = { top: 20, right: 10, bottom: labelH, left: 48 };
  const plotH = height - M.top - M.bottom;
  const innerW = Math.max(0, width - M.left - M.right);
  const band = items.length ? innerW / items.length : 0;
  const barW = Math.min(48, Math.max(10, band * 0.54));

  // running totals
  let run = 0;
  const bars = items.map((it) => {
    const isAnchor = it.kind === "anchor";
    const from = isAnchor ? 0 : run;
    const to = isAnchor ? it.value : run + it.value;
    if (!isAnchor) run = to;
    else run = it.value;
    return { ...it, from, to, isAnchor };
  });

  const all = bars.flatMap((b) => [b.from, b.to]);
  const axis = niceScale(Math.min(...all, 0), Math.max(...all, 0), 3);
  const y = linearScale([axis.min, axis.max], [M.top + plotH, M.top]);

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 ? (
        <svg width={width} height={height} role="img" aria-label="Waterfall of contributions to net profit">
          <GridLines ticks={axis.ticks} scale={y} x0={M.left} x1={width - M.right} format={axisMoney} zeroAt={0} />

          {bars.map((b, i) => {
            const cx = M.left + band * i + band / 2;
            const x = cx - barW / 2;
            const yFrom = y(b.from);
            const yTo = y(b.to);
            const top = Math.min(yFrom, yTo);
            const h = Math.max(Math.abs(yTo - yFrom), 2);
            const positive = b.to >= b.from;

            const color = b.isAnchor
              ? b.value >= 0
                ? "var(--brand)"
                : "var(--critical)"
              : positive
                ? "var(--div-pos-2)"
                : "var(--div-neg-2)";

            const dim = hover !== null && hover !== i;

            return (
              <g key={`${b.label}-${i}`} style={{ opacity: dim ? 0.35 : 1, transition: "opacity 150ms" }}>
                {/* connector to the next bar */}
                {i < bars.length - 1 ? (
                  <line
                    x1={cx + barW / 2}
                    x2={M.left + band * (i + 1) + band / 2 - barW / 2}
                    y1={yTo}
                    y2={yTo}
                    stroke="var(--line-strong)"
                    strokeWidth={1}
                    shapeRendering="crispEdges"
                  />
                ) : null}

                <path
                  d={barPath(x, top, barW, h, 4, positive ? "top" : "bottom")}
                  fill={color}
                  className="grow-y"
                  style={{ transformOrigin: `${cx}px ${y(0)}px`, animationDelay: `${i * 55}ms` }}
                />

                {/* value label above/below the data end */}
                <text
                  x={cx}
                  y={positive ? top - 6 : top + h + 12}
                  textAnchor="middle"
                  fontSize={10.5}
                  fontWeight={700}
                  fill={b.isAnchor ? "var(--ink)" : positive ? "var(--good-ink)" : "var(--critical-ink)"}
                  className="tnum"
                >
                  {b.isAnchor
                    ? moneyCompact(b.value)
                    : `${b.value >= 0 ? "+" : "−"}${moneyCompact(Math.abs(b.value)).replace("−", "")}`}
                </text>

                <rect
                  x={M.left + band * i}
                  y={M.top}
                  width={band}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${b.label}: ${money(b.value)}`}
                  className="cursor-crosshair outline-none"
                  onMouseEnter={(e) => {
                    setHover(i);
                    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                    show({
                      x: e.clientX - rect.left,
                      y: 6,
                      title: b.label,
                      rows: [
                        { label: b.isAnchor ? "Total" : "Impact", value: money(b.value), strong: true, color },
                        ...(b.isAnchor ? [] : [{ label: "Running", value: money(b.to) }]),
                      ],
                      note: b.detail,
                    });
                  }}
                  onFocus={() => setHover(i)}
                  onMouseLeave={() => {
                    setHover(null);
                    hide();
                  }}
                  onBlur={() => setHover(null)}
                />
              </g>
            );
          })}

          {/* x labels, wrapped to the band width */}
          {bars.map((b, i) => {
            const cx = M.left + band * i + band / 2;
            const words = b.label.split(" ");
            const lines: string[] = [];
            let line = "";
            const cap = Math.max(8, Math.floor(band / 6));
            for (const w of words) {
              if ((line + " " + w).trim().length > cap && line) {
                lines.push(line);
                line = w;
              } else line = (line + " " + w).trim();
            }
            if (line) lines.push(line);
            return (
              <text key={`lbl-${i}`} x={cx} textAnchor="middle" fontSize={10.5} fill="var(--ink-3)" fontWeight={500}>
                {lines.slice(0, labelLines).map((l, li) => (
                  <tspan key={li} x={cx} y={M.top + plotH + 15 + li * 12}>
                    {l}
                  </tspan>
                ))}
              </text>
            );
          })}
        </svg>
      ) : null}
      <ChartTooltip tip={tip} containerWidth={width} />
    </div>
  );
}
