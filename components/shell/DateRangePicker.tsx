"use client";

/**
 * Period and comparison in one control.
 *
 * Both halves are universal: the range scopes every chart and table in the
 * product, and the comparison is the period that every delta, badge and
 * insight is measured against. Picking "August vs January" here changes that
 * everywhere, rather than only on the screen you happen to be looking at.
 */

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown, GitCompareArrows } from "lucide-react";
import { useWorkspace, COMPARE_MODES, type CompareMode } from "@/lib/store";
import { RANGE_PRESETS, resolveRange, type RangePresetId } from "@/lib/data/model";
import { cn } from "@/lib/cn";

export function DateRangePicker({ className }: { className?: string }) {
  const {
    months,
    range,
    setRange,
    rangePreset,
    setRangePreset,
    visibleMonths,
    compareMode,
    setCompareMode,
    compareKey,
    setCompareKey,
    comparison,
  } = useWorkspace();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const from = visibleMonths[0];
  const to = visibleMonths[visibleMonths.length - 1];

  const previewOf = (id: RangePresetId) => {
    const r = resolveRange(id);
    const a = months.find((m) => m.key === r.from);
    const b = months.find((m) => m.key === r.to);
    return a && b ? (a.key === b.key ? a.shortLabel : `${a.shortLabel} to ${b.shortLabel}`) : "";
  };

  const comparePreview = (mode: CompareMode) => {
    if (mode === "custom") return "pick a month";
    const idx = months.findIndex((m) => m.key === to?.key);
    const offset = mode === "prev" ? 1 : mode === "prevQuarter" ? 3 : 12;
    return months[Math.max(0, idx - offset)]?.label ?? "";
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-9 w-full items-center gap-2 rounded-md border border-line bg-surface px-2.5 text-[12.5px] font-medium text-ink transition-colors hover:border-line-strong"
      >
        <CalendarDays size={14} className="shrink-0 text-ink-4" />
        <span className="truncate">
          {from?.shortLabel} to {to?.shortLabel}
        </span>
        <span className="hidden shrink-0 items-center gap-1 rounded bg-surface-3 px-1.5 py-0.5 text-[11px] font-semibold text-ink-2 sm:flex">
          <GitCompareArrows size={11} />
          vs {comparison.shortLabel}
        </span>
        <ChevronDown
          size={14}
          className={cn("ml-auto shrink-0 text-ink-4 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="anim-scale-in absolute top-full left-0 z-50 mt-1.5 w-[560px] max-w-[92vw] origin-top-left rounded-lg border border-line bg-surface shadow-pop">
          <div className="grid grid-cols-1 divide-line sm:grid-cols-2 sm:divide-x">
            {/* ---------------- period ---------------- */}
            <div className="p-2">
              <p className="label-xs px-2 py-1.5">Period shown</p>
              <ul>
                {RANGE_PRESETS.filter((p) => p.id !== "custom").map((p) => {
                  const active = rangePreset === p.id;
                  return (
                    <li key={p.id}>
                      <button
                        onClick={() => setRangePreset(p.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-left text-[12.5px] transition-colors",
                          active ? "bg-brand-soft text-brand-ink" : "text-ink-2 hover:bg-surface-3 hover:text-ink",
                        )}
                      >
                        <span className="font-medium">{p.label}</span>
                        <span className="flex items-center gap-2">
                          <span className="tnum text-[11px] text-ink-4">{previewOf(p.id)}</span>
                          {active ? <Check size={13} /> : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-1.5 border-t border-line pt-2">
                <p className="label-xs px-2 pb-1.5">Custom range</p>
                <div className="flex items-end gap-2 px-2">
                  <MonthSelect
                    label="From"
                    value={range.from}
                    max={range.to}
                    onChange={(v) => setRange({ from: v, to: range.to })}
                  />
                  <span className="pb-2 text-[11px] text-ink-4">to</span>
                  <MonthSelect
                    label="To"
                    value={range.to}
                    min={range.from}
                    onChange={(v) => setRange({ from: range.from, to: v })}
                  />
                </div>
                <p className="px-2 pt-2 text-[10.5px] text-ink-4">
                  {visibleMonths.length} month{visibleMonths.length === 1 ? "" : "s"} in view
                </p>
              </div>
            </div>

            {/* ---------------- comparison ---------------- */}
            <div className="border-t border-line p-2 sm:border-t-0">
              <p className="label-xs px-2 py-1.5">Compare {to?.label ?? "this period"} against</p>
              <ul>
                {COMPARE_MODES.map((m) => {
                  const active = compareMode === m.id;
                  return (
                    <li key={m.id}>
                      <button
                        onClick={() => setCompareMode(m.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-left text-[12.5px] transition-colors",
                          active ? "bg-brand-soft text-brand-ink" : "text-ink-2 hover:bg-surface-3 hover:text-ink",
                        )}
                      >
                        <span className="font-medium">{m.label}</span>
                        <span className="flex items-center gap-2">
                          <span className="tnum text-[11px] text-ink-4">{comparePreview(m.id)}</span>
                          {active ? <Check size={13} /> : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-1.5 border-t border-line pt-2">
                <div className="px-2">
                  <MonthSelect
                    label="Compare against"
                    value={compareKey}
                    max={to?.key}
                    onChange={(v) => setCompareKey(v)}
                  />
                </div>
                <p className="px-2 pt-2 text-[10.5px] leading-relaxed text-ink-4">
                  Every change figure in the product is measured against this month.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line bg-surface-2 px-3 py-2.5">
            <p className="text-[11.5px] text-ink-3">
              Showing <strong className="text-ink">{from?.label}</strong> to{" "}
              <strong className="text-ink">{to?.label}</strong>, compared against{" "}
              <strong className="text-ink">{comparison.label}</strong>
            </p>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md bg-brand px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-brand-hover"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MonthSelect({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (v: string) => void;
}) {
  const { months } = useWorkspace();
  return (
    <label className="block flex-1">
      <span className="mb-1 block text-[10.5px] font-medium text-ink-4">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full rounded-md border border-line bg-surface px-2 text-[12px] text-ink focus:border-brand focus:outline-none"
      >
        {months.map((m) => (
          <option
            key={m.key}
            value={m.key}
            disabled={(min !== undefined && m.key < min) || (max !== undefined && m.key > max)}
          >
            {m.label}
          </option>
        ))}
      </select>
    </label>
  );
}
