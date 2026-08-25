"use client";

/**
 * Chart primitives.
 *
 * Charts are hand-built SVG rather than a charting library so the mark specs
 * hold exactly: thin marks, 4px rounded data-ends anchored to the baseline,
 * 2px surface gaps between stacked fills, solid hairline gridlines, and a
 * hover layer with hit targets far larger than the marks themselves.
 *
 * Every chart also has a table twin (see `ChartCard`) so no value is ever
 * reachable only by hovering, and colour is never the sole encoding.
 */

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BarChart3, Table2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { CardHeader } from "@/components/ui/Card";

/* ============================================================================
 * Measurement
 * ==========================================================================*/

/**
 * Measures the container before paint, so the chart renders at its true width
 * on the first frame — no resize flash, no layout shift.
 */
export function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => setWidth(el.clientWidth);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}

/* ============================================================================
 * Geometry helpers
 * ==========================================================================*/

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function linearScale(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (v: number) => r0 + ((v - d0) / span) * (r1 - r0);
}

/**
 * "Nice" axis bounds and ticks — round numbers, always including zero when the
 * data straddles it, so the baseline is meaningful.
 */
export function niceScale(min: number, max: number, count = 4) {
  if (min > 0) min = 0;
  if (max < 0) max = 0;
  if (min === max) max = min + 1;
  const raw = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(raw) || 1)));
  const norm = raw / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + step / 2; v += step) {
    ticks.push(Math.abs(v) < step / 1e6 ? 0 : v);
  }
  return { min: niceMin, max: niceMax, ticks };
}

/** Rectangle with selective corner rounding — used for bar data-ends. */
export function barPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  corners: "top" | "bottom" | "none" | "all" | "right" | "left" = "top",
) {
  const rr = Math.max(0, Math.min(r, Math.abs(h) / 2, w / 2));
  if (h <= 0.4) return "";
  if (corners === "none" || rr === 0) return `M${x},${y}h${w}v${h}h${-w}Z`;
  if (corners === "top")
    return `M${x},${y + h}V${y + rr}a${rr},${rr} 0 0 1 ${rr},${-rr}h${w - 2 * rr}a${rr},${rr} 0 0 1 ${rr},${rr}V${y + h}Z`;
  if (corners === "bottom")
    return `M${x},${y}V${y + h - rr}a${rr},${rr} 0 0 0 ${rr},${rr}h${w - 2 * rr}a${rr},${rr} 0 0 0 ${rr},${-rr}V${y}Z`;
  if (corners === "right")
    return `M${x},${y}h${w - rr}a${rr},${rr} 0 0 1 ${rr},${rr}v${h - 2 * rr}a${rr},${rr} 0 0 1 ${-rr},${rr}h${-(w - rr)}Z`;
  if (corners === "left")
    return `M${x + w},${y}h${-(w - rr)}a${rr},${rr} 0 0 0 ${-rr},${rr}v${h - 2 * rr}a${rr},${rr} 0 0 0 ${rr},${rr}h${w - rr}Z`;
  return `M${x + rr},${y}h${w - 2 * rr}a${rr},${rr} 0 0 1 ${rr},${rr}v${h - 2 * rr}a${rr},${rr} 0 0 1 ${-rr},${rr}h${-(w - 2 * rr)}a${rr},${rr} 0 0 1 ${-rr},${-rr}v${-(h - 2 * rr)}a${rr},${rr} 0 0 1 ${rr},${-rr}Z`;
}

/** Catmull–Rom smoothing, converted to cubic béziers. Keeps lines honest. */
export function smoothPath(points: [number, number][], tension = 0.32) {
  if (points.length < 2) return "";
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension * 2;
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension * 2;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension * 2;
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension * 2;
    d += `C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export function linePath(points: [number, number][]) {
  return points.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join("");
}

/* ============================================================================
 * Chrome
 * ==========================================================================*/

export function GridLines({
  ticks,
  scale,
  x0,
  x1,
  format,
  zeroAt,
}: {
  ticks: number[];
  scale: (v: number) => number;
  x0: number;
  x1: number;
  format?: (v: number) => string;
  zeroAt?: number;
}) {
  return (
    <g aria-hidden>
      {ticks.map((t) => {
        const y = scale(t);
        const isZero = zeroAt !== undefined && Math.abs(t - zeroAt) < 1e-9;
        return (
          <g key={t}>
            <line
              x1={x0}
              x2={x1}
              y1={y}
              y2={y}
              stroke={isZero ? "var(--axis)" : "var(--grid)"}
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
            {format ? (
              <text
                x={x0 - 8}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="tnum"
                fontSize={10.5}
                fill="var(--ink-4)"
              >
                {format(t)}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

export function XLabels({
  labels,
  band,
  y,
  x0,
  highlight,
}: {
  labels: string[];
  band: number;
  y: number;
  x0: number;
  highlight?: number;
}) {
  return (
    <g aria-hidden>
      {labels.map((l, i) => (
        <text
          key={`${l}-${i}`}
          x={x0 + band * i + band / 2}
          y={y}
          textAnchor="middle"
          fontSize={10.5}
          fontWeight={highlight === i ? 700 : 500}
          fill={highlight === i ? "var(--ink)" : "var(--ink-4)"}
        >
          {l}
        </text>
      ))}
    </g>
  );
}

/* ============================================================================
 * Legend — always present for two or more series
 * ==========================================================================*/

export interface LegendItem {
  label: string;
  color: string;
  shape?: "square" | "line" | "dash";
  value?: string;
}

export function Legend({
  items,
  className,
  onHover,
  activeLabel,
}: {
  items: LegendItem[];
  className?: string;
  onHover?: (label: string | null) => void;
  activeLabel?: string | null;
}) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5", className)}>
      {items.map((it) => {
        const dim = activeLabel != null && activeLabel !== it.label;
        return (
          <li
            key={it.label}
            onMouseEnter={() => onHover?.(it.label)}
            onMouseLeave={() => onHover?.(null)}
            className={cn(
              "flex cursor-default items-center gap-1.5 text-[11.5px] transition-opacity duration-150",
              dim ? "opacity-35" : "opacity-100",
            )}
          >
            {it.shape === "line" || it.shape === "dash" ? (
              <svg width={14} height={8} aria-hidden className="shrink-0">
                <line
                  x1={0}
                  y1={4}
                  x2={14}
                  y2={4}
                  stroke={it.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeDasharray={it.shape === "dash" ? "3 3" : undefined}
                />
              </svg>
            ) : (
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ background: it.color }}
              />
            )}
            <span className="text-ink-2">{it.label}</span>
            {it.value ? <span className="tnum font-semibold text-ink">{it.value}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

/* ============================================================================
 * Tooltip
 * ==========================================================================*/

export interface TooltipState {
  x: number;
  y: number;
  title: string;
  rows: { label: string; value: string; color?: string; strong?: boolean }[];
  note?: string;
}

export function useTooltip() {
  const [tip, setTip] = useState<TooltipState | null>(null);
  const show = useCallback((t: TooltipState) => setTip(t), []);
  const hide = useCallback(() => setTip(null), []);
  return { tip, show, hide };
}

export function ChartTooltip({ tip, containerWidth }: { tip: TooltipState | null; containerWidth: number }) {
  if (!tip) return null;
  const W = 208;
  const flip = tip.x + W + 20 > containerWidth;
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-30 rounded-lg border border-line bg-surface p-2.5 shadow-pop"
      style={{
        width: W,
        left: flip ? tip.x - W - 12 : tip.x + 12,
        top: Math.max(4, tip.y - 12),
        transition: "left 90ms linear, top 90ms linear",
      }}
    >
      <p className="mb-1.5 text-[11px] font-bold tracking-wide text-ink uppercase">{tip.title}</p>
      <ul className="space-y-1">
        {tip.rows.map((r, i) => (
          <li key={i} className="flex items-center justify-between gap-3 text-[11.5px]">
            <span className="flex min-w-0 items-center gap-1.5">
              {r.color ? (
                <span className="size-2 shrink-0 rounded-[2px]" style={{ background: r.color }} aria-hidden />
              ) : null}
              <span className="truncate text-ink-2">{r.label}</span>
            </span>
            <span className={cn("tnum shrink-0", r.strong ? "font-bold text-ink" : "font-semibold text-ink")}>
              {r.value}
            </span>
          </li>
        ))}
      </ul>
      {tip.note ? (
        <p className="mt-1.5 border-t border-line pt-1.5 text-[10.5px] leading-snug text-ink-4">{tip.note}</p>
      ) : null}
    </div>
  );
}

/* ============================================================================
 * ChartCard — chart / table twin
 * ==========================================================================*/

export interface TableTwin {
  columns: string[];
  rows: (string | number)[][];
  caption?: string;
}

export function ChartCard({
  title,
  subtitle,
  info,
  action,
  legend,
  children,
  table,
  className,
  bodyClassName,
  footer,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  info?: string;
  action?: ReactNode;
  legend?: ReactNode;
  children: ReactNode;
  table?: TableTwin;
  className?: string;
  bodyClassName?: string;
  footer?: ReactNode;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");

  return (
    <section
      className={cn(
        "relative flex flex-col rounded-lg border border-line bg-surface p-5 shadow-xs transition-[box-shadow,border-color] duration-200 hover:shadow-sm",
        className,
      )}
    >
      <CardHeader
        title={title}
        subtitle={subtitle}
        info={info}
        action={
          <>
            {action}
            {table ? (
              <div className="flex rounded-md border border-line bg-surface-2 p-0.5">
                <button
                  onClick={() => setView("chart")}
                  aria-label="Chart view"
                  aria-pressed={view === "chart"}
                  className={cn(
                    "grid size-7 place-items-center rounded-[5px] transition-colors",
                    view === "chart" ? "bg-surface text-brand shadow-xs" : "text-ink-4 hover:text-ink-2",
                  )}
                >
                  <BarChart3 size={13.5} />
                </button>
                <button
                  onClick={() => setView("table")}
                  aria-label="Table view"
                  aria-pressed={view === "table"}
                  className={cn(
                    "grid size-7 place-items-center rounded-[5px] transition-colors",
                    view === "table" ? "bg-surface text-brand shadow-xs" : "text-ink-4 hover:text-ink-2",
                  )}
                >
                  <Table2 size={13.5} />
                </button>
              </div>
            ) : null}
          </>
        }
      />

      {legend ? <div className="mt-3">{legend}</div> : null}

      <div className={cn("relative mt-3 min-h-0 flex-1", bodyClassName)}>
        {view === "chart" ? (
          children
        ) : table ? (
          <DataTable {...table} />
        ) : null}
      </div>

      {footer ? <div className="mt-3">{footer}</div> : null}
    </section>
  );
}

export function DataTable({ columns, rows, caption }: TableTwin) {
  return (
    <div className="anim-fade-in max-h-[340px] overflow-auto rounded-md border border-line">
      <table className="w-full border-collapse text-[12px]">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className="sticky top-0 z-10 bg-surface-2">
          <tr>
            {columns.map((c, i) => (
              <th
                key={c}
                scope="col"
                className={cn(
                  "border-b border-line px-2.5 py-2 font-semibold text-ink-2",
                  i === 0 ? "text-left" : "text-right",
                )}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="transition-colors hover:bg-surface-2">
              {r.map((cell, ci) => (
                <td
                  key={ci}
                  className={cn(
                    "border-b border-line-soft px-2.5 py-1.5",
                    ci === 0 ? "text-left font-medium text-ink" : "tnum text-right text-ink-2",
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
