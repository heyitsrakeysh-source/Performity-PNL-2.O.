"use client";

/**
 * A headline tile whose metric the reader chooses.
 *
 * The picker is the point: the four things worth watching differ by brand and
 * by month, so the row is configurable rather than fixed. Choices persist per
 * browser.
 */

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { METRICS, metric, type MetricDef } from "@/lib/data/metrics";
import type { MonthFigures } from "@/lib/data/model";
import { cn } from "@/lib/cn";
import { Delta } from "@/components/ui/Delta";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Sparkline } from "@/components/charts/Sparkline";
import { InfoDot } from "@/components/ui/Card";

export function MetricTile({
  metricId,
  onChangeMetric,
  current,
  comparison,
  comparisonLabel,
  series,
  taken,
  index = 0,
}: {
  metricId: string;
  onChangeMetric: (id: string) => void;
  current: MonthFigures;
  comparison: MonthFigures;
  comparisonLabel: string;
  series: MonthFigures[];
  taken: string[];
  index?: number;
}) {
  const def = metric(metricId);
  const value = def.get(current);
  const prior = def.get(comparison);
  const negative = value < 0;
  // Profit lines take their colour from the sign, so a profitable brand does
  // not get a red trend line.
  const signed = def.id === "netProfit" || def.id === "netMargin";
  const seriesColor = signed ? (negative ? "var(--critical)" : "var(--good)") : def.color;

  return (
    <div
      className="group relative flex flex-col rounded-lg border border-line bg-surface p-4 shadow-xs transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-px hover:border-line-strong hover:shadow-md"
      style={{ ["--i" as string]: index }}
    >
      <div className="flex items-start gap-1.5">
        <MetricPicker value={metricId} onChange={onChangeMetric} taken={taken} />
        <span className="mt-0.5 shrink-0">
          <InfoDot text={def.info} />
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <AnimatedNumber
          value={value}
          format={(n) => (def.compact ?? def.format)(n)}
          className={cn(
            "figure-lg text-[24px] leading-none sm:text-[26px]",
            def.id === "netProfit" || def.id === "netMargin"
              ? negative
                ? "text-critical-ink"
                : "text-good-ink"
              : "text-ink",
          )}
        />
        <Delta
          current={value}
          previous={prior}
          higherIsBetter={def.higherIsBetter}
          mode={def.isRate ? "pp" : "pct"}
          size="sm"
        />
      </div>

      <p className="mt-1 text-[11px] text-ink-4">
        {def.format(prior)} {comparisonLabel.replace("vs ", "in ")}
      </p>

      {series.length > 1 ? (
        <div className="mt-2.5 -mb-0.5">
          <Sparkline values={series.map((m) => def.get(m))} color={seriesColor} height={34} />
        </div>
      ) : null}

      {def.footnote ? (
        <p className="mt-2 text-[11.5px] leading-snug text-ink-4">{def.footnote(current)}</p>
      ) : null}
    </div>
  );
}

function MetricPicker({
  value,
  onChange,
  taken,
}: {
  value: string;
  onChange: (id: string) => void;
  taken: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const def = metric(value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const groups = [...new Set(METRICS.map((m) => m.group))];

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="-ml-1 flex max-w-full items-center gap-1 rounded px-1 py-0.5 text-[12px] font-medium text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
      >
        <span className="truncate">{def.label}</span>
        <ChevronDown
          size={12}
          className={cn(
            "shrink-0 opacity-0 transition-[opacity,transform] duration-200 group-hover:opacity-100",
            open && "rotate-180 opacity-100",
          )}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className="anim-scale-in absolute top-full left-0 z-50 mt-1 max-h-[320px] w-[248px] origin-top-left overflow-y-auto rounded-lg border border-line bg-surface p-1.5 shadow-pop"
        >
          {groups.map((g) => (
            <div key={g} className="mb-1">
              <p className="label-xs px-2 py-1 text-[10px]">{g}</p>
              {METRICS.filter((m) => m.group === g).map((m: MetricDef) => {
                const selected = m.id === value;
                const used = taken.includes(m.id) && !selected;
                return (
                  <button
                    key={m.id}
                    role="option"
                    aria-selected={selected}
                    disabled={used}
                    onClick={() => {
                      onChange(m.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors",
                      selected
                        ? "bg-brand-soft font-medium text-brand-ink"
                        : used
                          ? "cursor-not-allowed text-ink-4 opacity-50"
                          : "text-ink-2 hover:bg-surface-3 hover:text-ink",
                    )}
                  >
                    <span className="truncate">{m.label}</span>
                    {selected ? <Check size={13} className="shrink-0" /> : null}
                    {used ? <span className="shrink-0 text-[10px]">shown</span> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Remembers the reader's tile choices between visits. */
export function useTileChoice(defaults: string[]) {
  const [ids, setIds] = useState<string[]>(defaults);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("performity-tiles");
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed) && parsed.length === defaults.length) setIds(parsed);
      }
    } catch {
      /* tile choice is a convenience, not state we depend on */
    }
  }, [defaults.length]);

  const setAt = (index: number, id: string) => {
    setIds((prev) => {
      const next = [...prev];
      next[index] = id;
      try {
        localStorage.setItem("performity-tiles", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return { ids, setAt };
}
