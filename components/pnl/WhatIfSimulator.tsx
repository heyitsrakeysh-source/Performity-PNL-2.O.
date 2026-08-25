"use client";

/**
 * What-if simulator.
 *
 * The sliders are not decorative: each one writes a driver into the same
 * `computeMonth` the statement uses, so the projected column is the real
 * arithmetic of the change, and the "highest impact" ranking is measured by
 * perturbing each driver in turn rather than authored in advance.
 */

import { useMemo, useState } from "react";
import { RotateCcw, Save, Zap } from "lucide-react";
import { computeMonth, type MonthFigures } from "@/lib/data/model";
import { money, num, pct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Bits";
import { useToast } from "@/components/shell/Toast";

interface Lever {
  id: keyof Adjustments;
  label: string;
  unit: string;
  current: (m: MonthFigures) => number;
  format: (v: number) => string;
  /** true when turning the slider up is expected to help profit */
  upIsGood: boolean;
}

interface Adjustments {
  orders: number;
  aov: number;
  cogs: number;
  cac: number;
  fixed: number;
}

const ZERO: Adjustments = { orders: 0, aov: 0, cogs: 0, cac: 0, fixed: 0 };

const LEVERS: Lever[] = [
  { id: "orders", label: "Order volume", unit: "orders", current: (m) => m.orders, format: (v) => num(Math.round(v)), upIsGood: true },
  { id: "aov", label: "Average order value", unit: "₹", current: (m) => m.aov, format: money, upIsGood: true },
  { id: "cogs", label: "COGS per order", unit: "₹", current: (m) => m.cogsPerOrder, format: money, upIsGood: false },
  { id: "cac", label: "Ad spend", unit: "₹", current: (m) => m.adSpend, format: money, upIsGood: false },
  { id: "fixed", label: "Fixed cost", unit: "₹", current: (m) => m.fixedCost, format: money, upIsGood: false },
];

function simulate(base: MonthFigures, adj: Adjustments): MonthFigures {
  const d = base.drivers;
  const scaledFixed = 1 + adj.fixed / 100;
  return computeMonth({
    ...d,
    orders: Math.max(1, Math.round(d.orders * (1 + adj.orders / 100))),
    netAov: d.netAov * (1 + adj.aov / 100),
    cogsPerOrder: d.cogsPerOrder * (1 + adj.cogs / 100),
    // Ad spend is scaled as a total; with orders held, that is a CAC change.
    cac: d.cac * (1 + adj.cac / 100),
    fixed: {
      rent: d.fixed.rent * scaledFixed,
      salaries: d.fixed.salaries * scaledFixed,
      software: d.fixed.software * scaledFixed,
      other: d.fixed.other * scaledFixed,
    },
  });
}

export function WhatIfSimulator({ month }: { month: MonthFigures }) {
  const { push } = useToast();
  const [adj, setAdj] = useState<Adjustments>(ZERO);

  const projected = useMemo(() => simulate(month, adj), [month, adj]);
  const touched = Object.values(adj).some((v) => v !== 0);

  /** Sensitivity: move each lever 10% in its helpful direction and measure. */
  const ranked = useMemo(() => {
    return LEVERS.map((l) => {
      const probe: Adjustments = { ...ZERO, [l.id]: l.upIsGood ? 10 : -10 };
      const result = simulate(month, probe);
      return { lever: l, gain: result.netProfit - month.netProfit };
    })
      .sort((a, b) => b.gain - a.gain)
      .slice(0, 2);
  }, [month]);

  const rows = [
    { k: "Net profit", actual: month.netProfit, value: projected.netProfit, fmt: money, better: true },
    { k: "Net margin", actual: month.netMarginPct, value: projected.netMarginPct, fmt: (v: number) => pct(v, 2), better: true, pp: true },
    { k: "Contribution / order", actual: month.contributionPerOrder, value: projected.contributionPerOrder, fmt: money, better: true },
    { k: "Break-even ROAS", actual: month.breakEvenRoas, value: projected.breakEvenRoas, fmt: (v: number) => v.toFixed(2), better: false },
  ];

  return (
    <div>
      <div className="space-y-4">
        {LEVERS.map((l) => {
          const value = adj[l.id];
          const simulatedValue = l.current(projected);
          return (
            <div key={l.id}>
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor={`lever-${l.id}`} className="text-[12.5px] font-medium text-ink">
                  {l.label}
                </label>
                <span className="flex items-baseline gap-2">
                  <span className="tnum text-[11.5px] text-ink-4">{l.format(l.current(month))}</span>
                  <span
                    className={cn(
                      "tnum rounded-md px-1.5 py-0.5 text-[11.5px] font-bold",
                      value === 0
                        ? "bg-surface-3 text-ink-3"
                        : (value > 0) === l.upIsGood
                          ? "bg-good-soft text-good-ink"
                          : "bg-critical-soft text-critical-ink",
                    )}
                  >
                    {l.format(simulatedValue)}
                  </span>
                </span>
              </div>
              <div className="slider-wrap mt-2">
                <span className="slider-track" aria-hidden />
                <span
                  className="slider-fill"
                  aria-hidden
                  style={{
                    left: `${value >= 0 ? 50 : 50 + value * 2}%`,
                    width: `${Math.abs(value) * 2}%`,
                    background: value === 0 ? "transparent" : (value > 0) === l.upIsGood ? "var(--good)" : "var(--critical)",
                  }}
                />
                <span className="slider-notch" aria-hidden />
                <input
                  id={`lever-${l.id}`}
                  type="range"
                  min={-25}
                  max={25}
                  step={1}
                  value={value}
                  onChange={(e) => setAdj((a) => ({ ...a, [l.id]: Number(e.target.value) }))}
                  className="slider"
                  aria-valuetext={`${value > 0 ? "+" : ""}${value}% — ${l.format(simulatedValue)}`}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-ink-4">
                <span>−25%</span>
                <span className={cn("tnum font-semibold", value !== 0 && "text-brand-ink")}>
                  {value > 0 ? "+" : ""}
                  {value}%
                </span>
                <span>+25%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---- projected results ---- */}
      <div className="mt-5 rounded-lg border border-line bg-surface-2 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12.5px] font-semibold text-ink">Projected results</p>
          <Chip tone={touched ? "brand" : "neutral"}>{touched ? "simulated" : "no change"}</Chip>
        </div>
        <dl className="mt-3 space-y-2.5">
          {rows.map((r) => {
            const diff = r.value - r.actual;
            const good = r.better ? diff > 0 : diff < 0;
            return (
              <div key={r.k} className="flex items-baseline justify-between gap-3">
                <dt className="text-[12px] text-ink-3">{r.k}</dt>
                <dd className="flex items-baseline gap-2">
                  <span className="tnum text-[14px] font-bold text-ink">{r.fmt(r.value)}</span>
                  {Math.abs(diff) > 0.005 ? (
                    <span
                      className={cn(
                        "tnum text-[11px] font-semibold",
                        good ? "text-good-ink" : "text-critical-ink",
                      )}
                    >
                      {diff > 0 ? "+" : "−"}
                      {r.pp ? `${Math.abs(diff).toFixed(2)}pp` : r.fmt(Math.abs(diff)).replace("−", "")}
                    </span>
                  ) : (
                    <span className="text-[11px] text-ink-4">vs actual</span>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>

      <div className="mt-3 flex gap-2">
        <Button size="sm" className="flex-1" icon={<RotateCcw size={13} />} onClick={() => setAdj(ZERO)} disabled={!touched}>
          Reset
        </Button>
        <Button
          size="sm"
          variant="primary"
          className="flex-1"
          icon={<Save size={13} />}
          disabled={!touched}
          onClick={() =>
            push({
              title: "Scenario saved",
              body: `Projected net profit ${money(projected.netProfit)} · margin ${pct(projected.netMarginPct, 2)}`,
              tone: "good",
            })
          }
        >
          Save scenario
        </Button>
      </div>

      {/* ---- measured sensitivity ---- */}
      <div className="mt-4 rounded-lg border border-line bg-brand-soft p-3.5">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-ink">
          <Zap size={13} />
          Highest impact levers
        </p>
        <ol className="mt-2 space-y-1.5">
          {ranked.map((r, i) => (
            <li key={r.lever.id} className="flex items-baseline justify-between gap-2 text-[11.5px]">
              <span className="text-brand-ink">
                {i + 1}. {r.lever.label} {r.lever.upIsGood ? "up" : "down"} 10%
              </span>
              <span className="tnum font-bold text-brand-ink">{money(r.gain, { sign: true })}</span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[11px] leading-snug text-brand-ink/80">
          Measured by perturbing each driver against the live model — together these two move profit by{" "}
          {money(ranked.reduce((s, r) => s + r.gain, 0))}.
        </p>
      </div>
    </div>
  );
}
