"use client";

/**
 * Profit flow. Gross revenue narrows to net revenue after returns and
 * discounts, then splits into the cost streams that consume it.
 *
 * When costs exceed revenue the outflow ribbons are scaled to total spend and
 * the shortfall is called out explicitly, a ribbon can't be drawn for money
 * that was never there, and shrinking the others to fake a fit would misstate
 * the composition.
 */

import { useState } from "react";
import type { MonthFigures } from "@/lib/data/model";
import { COST_CATEGORIES, seriesVar } from "@/lib/data/model";
import { money, moneyCompact, pct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useMeasure } from "./primitives";

interface Flow {
  id: string;
  label: string;
  value: number;
  color: string;
  share: number;
}

function ribbon(x0: number, y0: number, h0: number, x1: number, y1: number, h1: number) {
  const cx = (x0 + x1) / 2;
  return [
    `M${x0},${y0}`,
    `C${cx},${y0} ${cx},${y1} ${x1},${y1}`,
    `L${x1},${y1 + h1}`,
    `C${cx},${y1 + h1} ${cx},${y0 + h0} ${x0},${y0 + h0}`,
    "Z",
  ].join(" ");
}

export function SankeyFlow({ month, height = 380 }: { month: MonthFigures; height?: number }) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);

  const NODE_W = 13;
  const PAD = { top: 34, bottom: 16 };
  const plotH = height - PAD.top - PAD.bottom;

  const flows: Flow[] = COST_CATEGORIES.map((c) => {
    const value = c.get(month);
    return {
      id: c.id,
      label: c.label,
      value,
      color: seriesVar(c.slot),
      share: (value / month.totalRevenue) * 100,
    };
  });

  const totalOutflow = flows.reduce((s, f) => s + f.value, 0);
  const loss = month.netProfit;
  const profitable = loss >= 0;
  const outflowTotal = profitable ? totalOutflow + loss : totalOutflow;

  const colGross = 4;
  const colNet = Math.max(120, width * 0.31);
  const colOut = Math.max(240, width * 0.66);
  const labelX = colOut + NODE_W + 10;

  // Node heights
  const grossH = plotH;
  const netH = plotH * (month.totalRevenue / month.grossRevenue);
  const returnsH = plotH - netH;

  const GAP = 8;
  const MIN_NODE = 10;
  const outCount = flows.length + (profitable ? 1 : 0);
  const availH = plotH - GAP * (outCount - 1);

  const outEntries = [
    ...flows,
    ...(profitable
      ? [{ id: "profit", label: "Net profit", value: loss, color: "var(--good)", share: month.netMarginPct }]
      : []),
  ];

  // Proportional heights, with a floor so a 2% flow is still a visible target.
  const rawHeights = outEntries.map((f) => (f.value / outflowTotal) * availH);
  const deficit = rawHeights.reduce((s2, h) => s2 + Math.max(0, MIN_NODE - h), 0);
  const surplusTotal = rawHeights.reduce((s2, h) => s2 + Math.max(0, h - MIN_NODE), 0);
  const heights = rawHeights.map((h) =>
    h < MIN_NODE ? MIN_NODE : h - (surplusTotal > 0 ? (deficit * (h - MIN_NODE)) / surplusTotal : 0),
  );

  let cursor = PAD.top;
  const outNodes = outEntries.map((f, i) => {
    const node = { ...f, y: cursor, h: heights[i] };
    cursor += heights[i] + GAP;
    return node;
  });

  // Labels are laid out separately from the nodes and pushed apart to a
  // minimum spacing, with a leader drawn when they no longer line up.
  const LABEL_MIN = 30;
  const labelYs: number[] = [];
  for (let i = 0; i < outNodes.length; i++) {
    const preferred = outNodes[i].y + outNodes[i].h / 2;
    labelYs.push(i === 0 ? preferred : Math.max(preferred, labelYs[i - 1] + LABEL_MIN));
  }
  const overflow = labelYs[labelYs.length - 1] - (height - PAD.bottom - 6);
  if (overflow > 0) for (let i = 0; i < labelYs.length; i++) labelYs[i] -= overflow;

  // Source anchor points on the net-revenue node, proportional to each flow.
  let srcCursor = PAD.top;
  const srcSpans = outNodes.map((n) => {
    const h = (n.value / outflowTotal) * netH;
    const span = { y: srcCursor, h };
    srcCursor += h;
    return span;
  });

  return (
    <div>
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 ? (
        <svg width={width} height={height} role="img" aria-label="Flow of revenue into cost categories">
          {/* gross -> net */}
          <path
            d={ribbon(colGross + NODE_W, PAD.top, netH, colNet, PAD.top, netH)}
            fill="var(--brand)"
            opacity={hover && hover !== "net" ? 0.1 : 0.16}
            style={{ transition: "opacity 150ms" }}
          />
          {/* gross -> returns */}
          <path
            d={ribbon(colGross + NODE_W, PAD.top + netH, returnsH, colNet, PAD.top + netH, returnsH)}
            fill="var(--critical)"
            opacity={0.14}
          />

          {/* net -> outflows */}
          {outNodes.map((n, i) => (
            <path
              key={n.id}
              d={ribbon(colNet + NODE_W, srcSpans[i].y, srcSpans[i].h, colOut, n.y, n.h)}
              fill={n.color}
              opacity={hover === null ? 0.3 : hover === n.id ? 0.55 : 0.08}
              style={{ transition: "opacity 150ms" }}
            />
          ))}

          {/* nodes */}
          <rect x={colGross} y={PAD.top} width={NODE_W} height={grossH} rx={3} fill="var(--brand)" opacity={0.45} />
          <rect x={colNet} y={PAD.top} width={NODE_W} height={netH} rx={3} fill="var(--brand)" />
          <rect x={colNet} y={PAD.top + netH} width={NODE_W} height={returnsH} rx={3} fill="var(--critical)" opacity={0.7} />

          {outNodes.map((n, i) => {
            const ly = labelYs[i];
            const center = n.y + n.h / 2;
            return (
              <g
                key={`node-${n.id}`}
                onMouseEnter={() => setHover(n.id)}
                onMouseLeave={() => setHover(null)}
                className="cursor-pointer"
              >
                <rect x={colOut} y={n.y} width={NODE_W} height={Math.max(n.h, 2)} rx={3} fill={n.color} />
                {Math.abs(ly - center) > 3 ? (
                  <path
                    d={`M${colOut + NODE_W},${center}H${labelX - 7}V${ly}`}
                    fill="none"
                    stroke={n.color}
                    strokeWidth={1}
                    strokeOpacity={0.5}
                  />
                ) : null}
                <rect x={colOut - 6} y={Math.min(n.y, ly - 12) - 3} width={width - colOut} height={Math.abs(ly - n.y) + n.h + 12} fill="transparent" />
                <text x={labelX} y={ly - 2} fontSize={11.5} fontWeight={600} fill="var(--ink)">
                  {n.label}
                </text>
                <text x={labelX} y={ly + 11} fontSize={11} fill="var(--ink-3)" className="tnum">
                  {moneyCompact(n.value)} · {pct(n.share)}
                </text>
                <title>{`${n.label}: ${money(n.value)} (${pct(n.share)} of revenue)`}</title>
              </g>
            );
          })}

          {/* left labels */}
          <text x={colGross} y={PAD.top - 18} fontSize={11.5} fontWeight={600} fill="var(--ink)">
            Gross revenue
          </text>
          <text x={colGross} y={PAD.top - 5} fontSize={11} fill="var(--ink-3)" className="tnum">
            {moneyCompact(month.grossRevenue)}
          </text>

          <text x={colNet} y={PAD.top - 18} fontSize={11.5} fontWeight={600} fill="var(--ink)">
            Net revenue
          </text>
          <text x={colNet} y={PAD.top - 5} fontSize={11} fill="var(--ink-3)" className="tnum">
            {moneyCompact(month.totalRevenue)}
          </text>

          <text x={colNet + NODE_W + 8} y={PAD.top + netH + 13} fontSize={11} fontWeight={600} fill="var(--critical-ink)">
            Returns &amp; discounts
          </text>
          <text x={colNet + NODE_W + 8} y={PAD.top + netH + 26} fontSize={10.5} fill="var(--ink-3)" className="tnum">
            −{moneyCompact(month.returnsAndDiscounts)}
          </text>
        </svg>
      ) : null}

    </div>
      {!profitable ? (
        <div className="mt-2 flex items-center gap-2 rounded-md border border-line bg-critical-soft px-3 py-2">
          <span className="size-2 shrink-0 rounded-full bg-critical" aria-hidden />
          <p className="text-[11.5px] font-medium text-critical-ink">
            Outflows total {money(totalOutflow)}, {money(Math.abs(loss))} more than the revenue that funded them
            ({pct(Math.abs(month.netMarginPct), 2)} of revenue).
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function SankeyLegend({ month }: { month: MonthFigures }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
      {COST_CATEGORIES.map((c) => (
        <li key={c.id} className={cn("flex items-center gap-1.5 text-[11.5px]")}>
          <span className="size-2.5 rounded-[3px]" style={{ background: seriesVar(c.slot) }} aria-hidden />
          <span className="text-ink-2">{c.label}</span>
          <span className="tnum font-semibold text-ink">{pct((c.get(month) / month.totalRevenue) * 100)}</span>
        </li>
      ))}
    </ul>
  );
}
