"use client";

/**
 * Period-on-period comparison.
 *
 * One row per metric: what it is now, what it was in the comparison period,
 * the change in absolute terms and as a percentage, and a bar showing which
 * lines moved most. The comparison period is whatever the reader chose in the
 * date control, so this works for month-on-month, quarter-on-quarter, or any
 * two months they want to put side by side.
 */

import { COMPARISON_ROW_IDS, metric } from "@/lib/data/metrics";
import type { MonthFigures, QuarterFigures } from "@/lib/data/model";
import { changePct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { DeltaText } from "@/components/ui/Delta";

export function PeriodComparison({
  current,
  comparison,
  currentLabel,
  comparisonLabel,
  rowIds = COMPARISON_ROW_IDS,
}: {
  current: MonthFigures | QuarterFigures;
  comparison: MonthFigures | QuarterFigures;
  currentLabel: string;
  comparisonLabel: string;
  rowIds?: string[];
}) {
  const rows = rowIds.map((id) => {
    const def = metric(id);
    const now = def.get(current);
    const was = def.get(comparison);
    const abs = now - was;
    const rel = def.isRate ? abs : changePct(now, was);
    return { def, now, was, abs, rel };
  });

  // Only rupee lines share the movement scale. Mixing a ROAS delta of 0.11
  // with a revenue delta of ₹2.45L would render every non-money bar invisible.
  const maxAbs = Math.max(
    ...rows.filter((r) => r.def.kind === "money").map((r) => Math.abs(r.abs)),
    1,
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
        <caption className="sr-only">
          {currentLabel} compared with {comparisonLabel}
        </caption>
        <thead className="bg-surface-2">
          <tr>
            <th scope="col" className="border-b border-line px-3 py-2.5 text-left text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
              Metric
            </th>
            <th scope="col" className="border-b border-line px-3 py-2.5 text-right text-[11px] font-semibold tracking-wide text-brand-ink uppercase">
              {currentLabel}
            </th>
            <th scope="col" className="border-b border-line px-3 py-2.5 text-right text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
              {comparisonLabel}
            </th>
            <th scope="col" className="border-b border-line px-3 py-2.5 text-right text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
              Change
            </th>
            <th scope="col" className="border-b border-line px-3 py-2.5 text-right text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
              %
            </th>
            <th scope="col" className="w-[130px] border-b border-line px-3 py-2.5 text-left text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
              Movement
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ def, now, was, abs, rel }) => {
            const good = def.higherIsBetter ? abs >= 0 : abs <= 0;
            const width = def.isRate ? 0 : (Math.abs(abs) / maxAbs) * 100;
            return (
              <tr key={def.id} className="group transition-colors hover:bg-surface-2">
                <th scope="row" className="border-b border-line-soft px-3 py-2 text-left font-medium text-ink">
                  <span className="flex items-center gap-2">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: def.color }} aria-hidden />
                    {def.label}
                  </span>
                </th>
                <td className="tnum border-b border-line-soft px-3 py-2 text-right font-semibold text-ink">
                  {def.format(now)}
                </td>
                <td className="tnum border-b border-line-soft px-3 py-2 text-right text-ink-3">{def.format(was)}</td>
                <td
                  className={cn(
                    "tnum border-b border-line-soft px-3 py-2 text-right font-medium",
                    good ? "text-good-ink" : "text-critical-ink",
                  )}
                >
                  {/* A change is written in the metric's own unit: rupees for
                      money, points for a rate, x for a ratio, orders for a count. */}
                  {abs >= 0 ? "+" : "−"}
                  {def.format(Math.abs(abs)).replace("−", "")}
                </td>
                <td className="border-b border-line-soft px-3 py-2 text-right">
                  {/* For a rate, the change column already reads as a percentage;
                      a second, near-identical percentage beside it only confuses. */}
                  {def.isRate ? (
                    <span className="text-ink-4">-</span>
                  ) : (
                    <DeltaText value={rel} higherIsBetter={def.higherIsBetter} />
                  )}
                </td>
                <td className="border-b border-line-soft px-3 py-2">
                  {def.kind !== "money" ? (
                    <span className="text-[11px] text-ink-4">{def.kind}</span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                        <span
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{
                            width: `${width}%`,
                            background: good ? "var(--good)" : "var(--critical)",
                            transition: "width 600ms cubic-bezier(0.16,1,0.3,1)",
                          }}
                        />
                      </span>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
