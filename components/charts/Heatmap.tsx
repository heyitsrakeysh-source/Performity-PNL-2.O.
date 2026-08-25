"use client";

/**
 * Margin-leak heatmap.
 *
 * The ramp is diverging, two poles that read as opposite with a neutral grey
 * midpoint, because the quantity has a real zero (profitable / loss-making).
 * Every cell carries its own value as text, so colour is redundant encoding
 * rather than the only channel.
 */

import type { SkuRow } from "@/lib/data/skus";
import { money, num, pct } from "@/lib/format";
import { cn } from "@/lib/cn";

type Col = {
  id: string;
  label: string;
  get: (s: SkuRow) => number;
  format: (v: number) => string;
  /** true when a bigger number is the better outcome */
  higherIsBetter: boolean;
};

const COLUMNS: Col[] = [
  { id: "gm", label: "Gross margin", get: (s) => s.grossMarginPct, format: (v) => pct(v), higherIsBetter: true },
  { id: "cac", label: "CAC", get: (s) => s.cac, format: (v) => money(v), higherIsBetter: false },
  { id: "ret", label: "Return rate", get: (s) => s.returnRate, format: (v) => pct(v), higherIsBetter: false },
  { id: "cm", label: "Contribution / order", get: (s) => s.contributionPerOrder, format: (v) => money(v), higherIsBetter: true },
  { id: "impact", label: "Profit impact", get: (s) => s.totalContribution, format: (v) => money(v), higherIsBetter: true },
];

/** Five diverging steps either side of a neutral midpoint. */
function rampColor(t: number) {
  // t in [-1, 1]
  if (t > 0.6) return "var(--div-pos-3)";
  if (t > 0.25) return "var(--div-pos-2)";
  if (t > 0.06) return "var(--div-pos-1)";
  if (t < -0.6) return "var(--div-neg-3)";
  if (t < -0.25) return "var(--div-neg-2)";
  if (t < -0.06) return "var(--div-neg-1)";
  return "var(--div-mid)";
}

function inkFor(t: number) {
  return Math.abs(t) > 0.25 ? "#fff" : "var(--ink)";
}

export function MarginHeatmap({ skus }: { skus: SkuRow[] }) {
  const rows = skus.filter((s) => !s.isLongTail).slice(0, 14);

  const norms = COLUMNS.map((c) => {
    const vals = rows.map(c.get);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const mid = (min + max) / 2;
    const half = (max - min) / 2 || 1;
    return (v: number) => {
      const t = (v - mid) / half; // -1..1
      return c.higherIsBetter ? t : -t;
    };
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-separate border-spacing-0 text-[12px]">
        <caption className="sr-only">
          SKU margin leak: gross margin, acquisition cost, return rate, contribution and profit impact
        </caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 bg-surface pb-2 pr-3 text-left text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
              SKU
            </th>
            {COLUMNS.map((c) => (
              <th key={c.id} scope="col" className="pb-2 pl-1.5 text-right text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((s, ri) => (
            <tr key={s.id} className="group">
              <th
                scope="row"
                className="sticky left-0 z-10 max-w-[180px] truncate bg-surface py-[3px] pr-3 text-left text-[12px] font-medium text-ink transition-colors group-hover:bg-surface-2"
              >
                <span className="tnum mr-1.5 text-ink-4">{ri + 1}</span>
                {s.name}
              </th>
              {COLUMNS.map((c, ci) => {
                const v = c.get(s);
                const t = norms[ci](v);
                return (
                  <td key={c.id} className="py-[3px] pl-1.5">
                    <div
                      className={cn(
                        "tnum flex h-7 items-center justify-end rounded-[5px] px-2 text-[11.5px] font-semibold",
                        "transition-transform duration-150 group-hover:scale-[1.015]",
                      )}
                      style={{ background: rampColor(t), color: inkFor(t) }}
                      title={`${s.name} · ${c.label}: ${c.format(v)}`}
                    >
                      {c.format(v)}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-3">
        <span>Worse</span>
        <span className="flex overflow-hidden rounded-full">
          {["var(--div-neg-3)", "var(--div-neg-2)", "var(--div-neg-1)", "var(--div-mid)", "var(--div-pos-1)", "var(--div-pos-2)", "var(--div-pos-3)"].map((c) => (
            <span key={c} className="h-2.5 w-7" style={{ background: c }} />
          ))}
        </span>
        <span>Better</span>
        <span className="ml-2 text-ink-4">Scaled within each column · {num(rows.length)} SKUs shown</span>
      </div>
    </div>
  );
}
