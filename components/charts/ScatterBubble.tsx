"use client";

/**
 * SKU profitability. Volume on x (log — order counts span two orders of
 * magnitude), contribution per order on y, revenue as area. Colour is
 * diverging polarity (loses money / makes money), not identity, so the
 * categorical slot rules don't apply here.
 */

import { useState } from "react";
import type { SkuRow } from "@/lib/data/skus";
import { money, num } from "@/lib/format";
import { ChartTooltip, GridLines, linearScale, niceScale, useMeasure, useTooltip } from "./primitives";

export function SkuScatter({ skus, height = 320 }: { skus: SkuRow[]; height?: number }) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const { tip, show, hide } = useTooltip();
  const [hover, setHover] = useState<string | null>(null);

  const M = { top: 14, right: 16, bottom: 34, left: 52 };
  const plotH = height - M.top - M.bottom;
  const innerW = Math.max(0, width - M.left - M.right);

  const rows = skus.filter((s) => !s.isLongTail);
  const yVals = rows.map((s) => s.contributionPerOrder);
  const axis = niceScale(Math.min(...yVals, 0), Math.max(...yVals, 0), 3);
  const y = linearScale([axis.min, axis.max], [M.top + plotH, M.top]);

  const minO = Math.min(...rows.map((s) => s.orders));
  const maxO = Math.max(...rows.map((s) => s.orders));
  // Volume spans well under a decade here, so a linear axis reads more
  // honestly than a log one — no artificial compression at the top end.
  const xAxis = niceScale(0, maxO * 1.06, 4);
  const x = linearScale([xAxis.min, xAxis.max], [M.left, M.left + innerW]);

  const maxRev = Math.max(...rows.map((s) => s.revenue));
  const r = (rev: number) => 6 + Math.sqrt(rev / maxRev) * 15;

  const zeroY = y(0);
  const ticks = xAxis.ticks.filter((t) => t > 0);

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 ? (
        <svg width={width} height={height} role="img" aria-label="Contribution per order against monthly order volume, sized by revenue">
          {/* loss region */}
          <rect
            x={M.left}
            y={zeroY}
            width={innerW}
            height={Math.max(0, M.top + plotH - zeroY)}
            fill="var(--critical)"
            opacity={0.05}
          />
          <GridLines
            ticks={axis.ticks}
            scale={y}
            x0={M.left}
            x1={width - M.right}
            format={(v) => `₹${v}`}
            zeroAt={0}
          />

          {ticks.map((t) => (
            <text key={t} x={x(t)} y={height - 14} textAnchor="middle" fontSize={10} fill="var(--ink-4)" className="tnum">
              {t >= 1000 ? `${t / 1000}K` : t}
            </text>
          ))}
          <text x={M.left + innerW / 2} y={height - 2} textAnchor="middle" fontSize={10} fill="var(--ink-4)">
            Monthly order volume
          </text>

          {/* the best performer, so the positive half is legible too */}
          {(() => {
            const best = [...rows].sort((a, b) => b.contributionPerOrder - a.contributionPerOrder)[0];
            const cx = x(best.orders);
            const cy = y(best.contributionPerOrder);
            const rr = r(best.revenue);
            return (
              <text
                x={cx + rr + 6}
                y={cy + 3.5}
                fontSize={10}
                fontWeight={600}
                fill="var(--good-ink)"
              >
                {best.name.split(" — ")[0]}
              </text>
            );
          })()}

          {rows.map((s) => {
            const cx = x(s.orders);
            const cy = y(s.contributionPerOrder);
            const rr = r(s.revenue);
            const neg = s.contributionPerOrder < 0;
            const isHover = hover === s.id;
            return (
              <g key={s.id}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={rr}
                  fill={neg ? "var(--div-neg-2)" : "var(--div-pos-2)"}
                  fillOpacity={isHover ? 0.9 : 0.62}
                  stroke="var(--surface)"
                  strokeWidth={2}
                  style={{ transition: "fill-opacity 140ms" }}
                />
                {/* hit target is always at least 24px across */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={Math.max(rr, 12)}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${s.name}: ${money(s.contributionPerOrder)} per order across ${num(s.orders)} orders`}
                  className="cursor-pointer outline-none"
                  onMouseEnter={(e) => {
                    setHover(s.id);
                    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                    show({
                      x: e.clientX - rect.left,
                      y: cy - 40,
                      title: s.name,
                      rows: [
                        { label: "Contribution / order", value: money(s.contributionPerOrder), strong: true },
                        { label: "Total contribution", value: money(s.totalContribution) },
                        { label: "Orders", value: num(s.orders) },
                        { label: "CAC", value: money(s.cac) },
                        { label: "Return rate", value: `${s.returnRate.toFixed(1)}%` },
                      ],
                    });
                  }}
                  onFocus={() => setHover(s.id)}
                  onMouseLeave={() => {
                    setHover(null);
                    hide();
                  }}
                  onBlur={() => setHover(null)}
                />
              </g>
            );
          })}

          {/* direct labels on the extremes only, with a leader so the text
              never sits on top of another mark */}
          {[...rows]
            .sort((a, b) => a.contributionPerOrder - b.contributionPerOrder)
            .slice(0, 3)
            .map((s, i) => {
              const cx = x(s.orders);
              const cy = y(s.contributionPerOrder);
              const rr = r(s.revenue);
              const flip = cx > M.left + innerW * 0.62;
              const lx2 = flip ? cx - rr - 8 : cx + rr + 8;
              const ly = cy + [0, 13, -13][i];
              return (
                <g key={`lbl-${s.id}`}>
                  <line
                    x1={flip ? cx - rr - 2 : cx + rr + 2}
                    y1={cy}
                    x2={lx2}
                    y2={ly}
                    stroke="var(--critical)"
                    strokeWidth={1}
                    strokeOpacity={0.5}
                  />
                  <text
                    x={flip ? lx2 - 3 : lx2 + 3}
                    y={ly + 3.5}
                    textAnchor={flip ? "end" : "start"}
                    fontSize={10}
                    fontWeight={600}
                    fill="var(--critical-ink)"
                  >
                    {s.name.split(" — ")[0]}
                  </text>
                </g>
              );
            })}
        </svg>
      ) : null}
      <ChartTooltip tip={tip} containerWidth={width} />
    </div>
  );
}
