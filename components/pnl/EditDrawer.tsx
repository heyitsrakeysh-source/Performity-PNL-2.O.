"use client";

/**
 * "Edit inputs". The panel the original tool called Edit Row Values.
 *
 * What changed: the numbers at the top recalculate *as you type*, so you can
 * see what an input does to net margin before committing it; each field shows
 * where it came from and what it was last month; and the completeness meter
 * plus "jump to next missing" turn a wall of inputs into a short queue.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CircleAlert,
  Copy,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Settings2,
  Trash2,
} from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { EDITOR_SCHEMA, SOURCE_META, type EditorField } from "@/lib/data/workspace";
import { priorMonth } from "@/lib/data/model";
import { money, num, pct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Drawer } from "@/components/ui/Drawer";
import { Button, IconButton } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Chip, Divider, ProgressBar, StatusBadge } from "@/components/ui/Bits";
import { Delta } from "@/components/ui/Delta";
import { useToast } from "@/components/shell/Toast";
import { CalculationPreferences } from "./CalculationPreferences";

type TabId = (typeof EDITOR_SCHEMA)[number]["id"];

interface CustomField {
  id: string;
  sectionId: string;
  label: string;
  value: number | null;
}

export function EditDrawer({
  open,
  monthKey,
  onClose,
}: {
  open: boolean;
  monthKey: string;
  onClose: () => void;
}) {
  const { monthByKey, fieldValue, commitEdits, previewMonth, resetMonth } = useWorkspace();
  const { push } = useToast();

  const month = monthByKey.get(monthKey);
  const prev = month ? priorMonth(monthKey) : undefined;

  const [tab, setTab] = useState<TabId>("revenue");
  const [draft, setDraft] = useState<Record<string, number | null>>({});
  const [units, setUnits] = useState<Record<string, "inr" | "pct">>({});
  const [custom, setCustom] = useState<CustomField[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setDraft({});
      setUnits({});
      setCustom([]);
      setShowSettings(false);
      setTab("revenue");
    }
  }, [open, monthKey]);

  const preview = useMemo(
    () => (month ? previewMonth(monthKey, draft) : undefined),
    [month, monthKey, draft, previewMonth],
  );

  if (!month || !preview) return null;

  const valueOf = (f: EditorField) => (f.id in draft ? draft[f.id] : fieldValue(monthKey, f));
  const lastMonthOf = (f: EditorField) => (prev ? fieldValue(prev.key, f) : null);

  const allFields = EDITOR_SCHEMA.flatMap((t) => t.sections.flatMap((s) => s.fields));
  const missing = allFields.filter((f) => valueOf(f) === null);
  const filled = allFields.length - missing.length;
  const completeness = (filled / allFields.length) * 100;
  const changeCount = Object.keys(draft).length + custom.filter((c) => c.value !== null).length;

  const tabCounts = (id: TabId) => {
    const t = EDITOR_SCHEMA.find((x) => x.id === id)!;
    const fs = t.sections.flatMap((s) => s.fields);
    return { filled: fs.filter((f) => valueOf(f) !== null).length, total: fs.length };
  };

  const setValue = (f: EditorField, raw: string) => {
    // Strip grouping separators so a formatted value round-trips cleanly.
    const cleaned = raw.replace(/[^0-9.\-]/g, "");
    if (cleaned === "" || cleaned === "-") {
      setDraft((d) => ({ ...d, [f.id]: null }));
      return;
    }
    const parsed = Number(cleaned);
    if (Number.isNaN(parsed)) return;
    const asInr = units[f.id] === "pct" ? (parsed / 100) * month.totalRevenue : parsed;
    setDraft((d) => ({ ...d, [f.id]: asInr }));
  };

  const jumpToNext = () => {
    const target = missing[0];
    if (!target) return;
    const owningTab = EDITOR_SCHEMA.find((t) =>
      t.sections.some((s) => s.fields.some((f) => f.id === target.id)),
    );
    if (owningTab) setTab(owningTab.id);
    requestAnimationFrame(() => {
      bodyRef.current?.querySelector<HTMLElement>(`[data-field="${target.id}"] input`)?.focus();
    });
  };

  const copyLastMonth = () => {
    if (!prev) return;
    const next: Record<string, number | null> = { ...draft };
    let n = 0;
    for (const f of allFields) {
      if (f.readOnly) continue;
      if (valueOf(f) === null) {
        const lm = lastMonthOf(f);
        if (lm !== null) {
          next[f.id] = lm;
          n += 1;
        }
      }
    }
    setDraft(next);
    push({ title: `Copied ${n} value${n === 1 ? "" : "s"} from ${prev.label}`, tone: "info" });
  };

  const save = () => {
    commitEdits(monthKey, draft);
    push({
      title: `Saved ${changeCount} change${changeCount === 1 ? "" : "s"}`,
      body: `${month.label} recalculated, net profit is now ${money(preview.netProfit)}.`,
      tone: "good",
    });
    onClose();
  };

  const activeTab = EDITOR_SCHEMA.find((t) => t.id === tab)!;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Edit inputs"
      subtitle={`Editing ${month.label} · ${num(month.orders)} orders`}
      width="min(820px, 96vw)"
      headerExtra={
        <>
          <IconButton
            label="Calculation preferences"
            active={showSettings}
            onClick={() => setShowSettings((v) => !v)}
          >
            <Settings2 size={16} />
          </IconButton>
          <IconButton
            label="Reset this month"
            onClick={() => {
              resetMonth(monthKey);
              setDraft({});
              push({ title: `${month.label} reset to synced values`, tone: "info" });
            }}
          >
            <RotateCcw size={15} />
          </IconButton>
        </>
      }
      footer={
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
            {missing.length > 0 ? (
              <>
                <CircleAlert size={14} className="text-warning" />
                {missing.length} field{missing.length === 1 ? "" : "s"} remaining
              </>
            ) : (
              <>
                <Check size={14} className="text-good" />
                All inputs complete
              </>
            )}
          </span>
          <Button size="sm" icon={<Copy size={13.5} />} onClick={copyLastMonth} disabled={!prev}>
            Copy all from last month
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={save} disabled={changeCount === 0}>
              {changeCount === 0 ? "No changes" : `Save ${changeCount} change${changeCount === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      }
    >
      {showSettings ? (
        <CalculationPreferences onClose={() => setShowSettings(false)} />
      ) : (
        <>
          {/* ---- live context: recalculates on every keystroke ---- */}
          <div className="grid grid-cols-3 divide-x divide-line border-b border-line bg-surface-2">
            <LiveStat label={`Revenue (${month.label})`} value={money(preview.totalRevenue)}>
              <Delta current={preview.totalRevenue} previous={prev?.totalRevenue ?? preview.totalRevenue} size="sm" />
            </LiveStat>
            <LiveStat label="Total costs" value={money(preview.totalRevenue - preview.netProfit)}>
              <Delta
                current={preview.totalRevenue - preview.netProfit}
                previous={prev ? prev.totalRevenue - prev.netProfit : preview.totalRevenue}
                higherIsBetter={false}
                size="sm"
              />
            </LiveStat>
            <LiveStat
              label="Live net margin"
              value={pct(preview.netMarginPct, 2)}
              tone={preview.netMarginPct < 0 ? "bad" : "good"}
            >
              {Math.abs(preview.netProfit - month.netProfit) > 0.5 ? (
                <Chip tone={preview.netProfit > month.netProfit ? "good" : "critical"}>
                  {money(preview.netProfit - month.netProfit, { sign: true })} from edits
                </Chip>
              ) : (
                <span className="text-[11px] text-ink-4">{money(preview.netProfit)} net</span>
              )}
            </LiveStat>
          </div>

          {/* ---- completeness ---- */}
          <div className="flex items-center gap-3 border-b border-line px-5 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12.5px] font-semibold text-ink">
                  Data {completeness.toFixed(0)}% complete
                </span>
                <span className="text-[11.5px] text-ink-3">
                  {filled} of {allFields.length} inputs
                </span>
              </div>
              <ProgressBar
                value={completeness}
                className="mt-1.5"
                tone={completeness >= 95 ? "good" : completeness >= 75 ? "brand" : "warning"}
              />
            </div>
            <Button
              size="sm"
              variant="subtle"
              onClick={jumpToNext}
              disabled={missing.length === 0}
              iconRight={<ArrowRight size={13} />}
            >
              Jump to next
            </Button>
          </div>

          {/* ---- tabs ---- */}
          <div className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-line bg-surface px-3 py-2">
            {EDITOR_SCHEMA.map((t) => {
              const c = tabCounts(t.id);
              const complete = c.filled === c.total;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  aria-current={tab === t.id}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                    tab === t.id ? "bg-brand-soft text-brand-ink" : "text-ink-3 hover:bg-surface-3 hover:text-ink",
                  )}
                >
                  {!complete ? <CircleAlert size={12.5} className="text-warning" /> : null}
                  {t.label}
                  <span
                    className={cn(
                      "tnum rounded-full px-1.5 py-px text-[10px] font-bold",
                      complete ? "bg-good-soft text-good-ink" : "bg-surface-3 text-ink-3",
                    )}
                  >
                    {c.filled}/{c.total}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ---- fields ---- */}
          <div ref={bodyRef} className="space-y-4 p-5">
            {activeTab.sections.map((section) => {
              const sectionFields = section.fields;
              const sFilled = sectionFields.filter((f) => valueOf(f) !== null).length;
              // Derived rows are another view of a figure already counted, so
              // they are excluded, otherwise the section total double-counts.
              const sectionTotal = sectionFields
                .filter((f) => !f.readOnly)
                .reduce((s, f) => s + (valueOf(f) ?? 0), 0);

              return (
                <section key={section.id} className="overflow-hidden rounded-lg border border-line">
                  <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-surface-2 px-4 py-2.5">
                    <h3 className="text-[13px] font-semibold text-ink">{section.title}</h3>
                    {section.help ? <p className="text-[11.5px] text-ink-4">{section.help}</p> : null}
                    <span className="ml-auto flex items-center gap-2">
                      <span className="tnum text-[12px] font-semibold text-ink-2">{money(sectionTotal)}</span>
                      <span
                        className={cn(
                          "tnum rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                          sFilled === sectionFields.length ? "bg-good-soft text-good-ink" : "bg-warning-soft text-warning-ink",
                        )}
                      >
                        {sFilled}/{sectionFields.length}
                      </span>
                    </span>
                  </header>

                  <div className="divide-y divide-line-soft">
                    {sectionFields.map((f) => (
                      <FieldRow
                        key={f.id}
                        field={f}
                        value={valueOf(f)}
                        lastMonth={lastMonthOf(f)}
                        lastMonthLabel={prev?.label}
                        unit={units[f.id] ?? "inr"}
                        revenue={month.totalRevenue}
                        edited={f.id in draft}
                        onUnit={(u) => setUnits((s) => ({ ...s, [f.id]: u }))}
                        onChange={(raw) => setValue(f, raw)}
                        onUseLastMonth={() => {
                          const lm = lastMonthOf(f);
                          if (lm !== null) setDraft((d) => ({ ...d, [f.id]: lm }));
                        }}
                      />
                    ))}

                    {custom
                      .filter((c) => c.sectionId === section.id)
                      .map((c) => (
                        <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                          <input
                            value={c.label}
                            onChange={(e) =>
                              setCustom((prevC) => prevC.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)))
                            }
                            placeholder="Field name"
                            className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-[12.5px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none"
                          />
                          <input
                            inputMode="decimal"
                            value={c.value ?? ""}
                            onChange={(e) =>
                              setCustom((prevC) =>
                                prevC.map((x) =>
                                  x.id === c.id ? { ...x, value: e.target.value === "" ? null : Number(e.target.value.replace(/[^0-9.\-]/g, "")) } : x,
                                ),
                              )
                            }
                            placeholder="0"
                            className="tnum w-[150px] rounded-md border border-line bg-surface px-2.5 py-1.5 text-right text-[12.5px] text-ink focus:border-brand focus:outline-none"
                          />
                          <IconButton label="Remove field" onClick={() => setCustom((p) => p.filter((x) => x.id !== c.id))}>
                            <Trash2 size={14} />
                          </IconButton>
                        </div>
                      ))}

                    <button
                      onClick={() =>
                        setCustom((p) => [
                          ...p,
                          { id: `custom-${section.id}-${p.length + 1}`, sectionId: section.id, label: "", value: null },
                        ])
                      }
                      className="flex w-full items-center justify-center gap-1.5 border-t border-dashed border-line py-2.5 text-[12px] font-medium text-ink-3 transition-colors hover:bg-surface-2 hover:text-brand-ink"
                    >
                      <Plus size={13} />
                      Add another field
                    </button>
                  </div>
                </section>
              );
            })}

            <button
              onClick={() => push({ title: "Custom sections", body: "In production this writes a new section to your chart of accounts.", tone: "info" })}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong bg-surface-2 py-3 text-[12.5px] font-medium text-ink-3 transition-colors hover:border-brand hover:text-brand-ink"
            >
              <Plus size={14} />
              Add another section
            </button>
          </div>
        </>
      )}
    </Drawer>
  );
}

/* ------------------------------------------------------------------------ */

function LiveStat({
  label,
  value,
  children,
  tone,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
  tone?: "good" | "bad";
}) {
  return (
    <div className="px-4 py-3">
      <p className="text-[11px] font-medium text-ink-3">{label}</p>
      <p
        className={cn(
          "figure-lg mt-0.5 text-[17px]",
          tone === "bad" ? "text-critical-ink" : tone === "good" ? "text-good-ink" : "text-ink",
        )}
      >
        {value}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function FieldRow({
  field,
  value,
  lastMonth,
  lastMonthLabel,
  unit,
  revenue,
  edited,
  onChange,
  onUnit,
  onUseLastMonth,
}: {
  field: EditorField;
  value: number | null;
  lastMonth: number | null;
  lastMonthLabel?: string;
  unit: "inr" | "pct";
  revenue: number;
  edited: boolean;
  onChange: (raw: string) => void;
  onUnit: (u: "inr" | "pct") => void;
  onUseLastMonth: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [recurring, setRecurring] = useState(Boolean(field.recurring));
  const missing = value === null;
  const source = SOURCE_META[field.source];

  const display =
    value === null
      ? ""
      : unit === "pct"
        ? ((value / revenue) * 100).toFixed(2)
        : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(value));

  return (
    <div
      data-field={field.id}
      className={cn(
        "group relative flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 transition-colors hover:bg-surface-2",
        missing && "bg-warning-soft/35",
      )}
    >
      {missing ? <span className="absolute inset-y-0 left-0 w-[3px] bg-warning" aria-hidden /> : null}

      <div className="min-w-[190px] flex-1">
        <div className="flex items-center gap-1.5">
          <span className={cn("text-[12.5px] font-medium", missing ? "text-warning-ink" : "text-ink")}>
            {field.label}
          </span>
          <span
            className="rounded bg-surface-3 px-1.5 py-px text-[9.5px] font-semibold tracking-wide text-ink-4 uppercase"
            title={source.label}
          >
            {source.short}
          </span>
          {field.readOnly ? <Chip tone="neutral">auto</Chip> : null}
        </div>
        <p className="mt-0.5 text-[11px] text-ink-4">
          {field.help ??
            (lastMonth !== null ? `${lastMonthLabel ?? "Last month"} · ${money(lastMonth)}` : "No prior value")}
        </p>
        {field.children?.length ? (
          <ul className="mt-1.5 space-y-1 border-l border-line pl-2.5">
            {field.children.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-ink-3">{c.label}</span>
                <span className="tnum text-ink-2">{c.seed === null ? "-" : money(c.seed)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {!field.readOnly ? (
        <div className="flex rounded-md border border-line bg-surface-2 p-0.5">
          {(["inr", "pct"] as const).map((u) => (
            <button
              key={u}
              onClick={() => onUnit(u)}
              aria-pressed={unit === u}
              className={cn(
                "grid h-6 w-7 place-items-center rounded-[5px] text-[11.5px] font-semibold transition-colors",
                unit === u ? "bg-surface text-brand shadow-xs" : "text-ink-4 hover:text-ink-2",
              )}
            >
              {u === "inr" ? "₹" : "%"}
            </button>
          ))}
        </div>
      ) : null}

      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-[12px] text-ink-4">
          {unit === "inr" ? "₹" : ""}
        </span>
        <input
          inputMode="decimal"
          readOnly={field.readOnly}
          value={display}
          placeholder={missing ? "Required" : "0"}
          onChange={(e) => onChange(e.target.value)}
          aria-label={field.label}
          className={cn(
            "tnum h-8 w-[152px] rounded-md border pr-2.5 text-right text-[12.5px] transition-colors focus:outline-none",
            unit === "inr" ? "pl-6" : "pl-2.5",
            field.readOnly
              ? "cursor-not-allowed border-line bg-surface-3 text-ink-3"
              : missing
                ? "border-warning bg-surface text-ink placeholder:text-warning-ink/60 focus:border-brand"
                : edited
                  ? "border-brand bg-brand-soft/40 text-ink focus:border-brand"
                  : "border-line bg-surface text-ink focus:border-brand",
          )}
        />
        {unit === "pct" ? (
          <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[12px] text-ink-4">
            %
          </span>
        ) : null}
      </div>

      {!field.readOnly && lastMonth !== null ? (
        <button
          onClick={onUseLastMonth}
          className="rounded-md border border-line px-2 py-1 text-[11px] font-medium text-ink-3 opacity-0 transition-[opacity,color,border-color] group-hover:opacity-100 hover:border-brand hover:text-brand-ink focus-visible:opacity-100"
        >
          Use last month
        </button>
      ) : null}

      {field.recurring ? (
        <span className="flex items-center gap-1.5">
          <span className="text-[10.5px] text-ink-4">Recurs</span>
          <Toggle size="sm" checked={recurring} onChange={setRecurring} label={`${field.label} recurs monthly`} />
        </span>
      ) : null}

      {edited ? <Check size={15} className="text-good" aria-label="Edited" /> : <span className="w-[15px]" />}

      <div className="relative">
        <IconButton label={`More options for ${field.label}`} onClick={() => setMenu((v) => !v)}>
          <MoreHorizontal size={15} />
        </IconButton>
        {menu ? (
          <>
            <button className="fixed inset-0 z-10 cursor-default" aria-hidden onClick={() => setMenu(false)} />
            <div className="anim-scale-in absolute top-full right-0 z-20 mt-1 w-52 origin-top-right rounded-lg border border-line bg-surface p-1.5 shadow-pop">
              <p className="px-2 py-1 text-[11px] text-ink-4">{source.label}</p>
              <Divider className="my-1" />
              {["Split across months", "Mark as estimate", "Add a comment", "View change history"].map((a) => (
                <button
                  key={a}
                  onClick={() => setMenu(false)}
                  className="w-full rounded-md px-2 py-1.5 text-left text-[12px] text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
                >
                  {a}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function MissingBanner({ count, onReview }: { count: number; onReview: () => void }) {
  if (count === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-warning-soft px-4 py-3">
      <StatusBadge status="warning" label={`${count} inputs missing`} />
      <p className="min-w-[200px] flex-1 text-[12.5px] text-warning-ink">
        Accuracy of the Advanced P&amp;L depends on these inputs and on your third-party integrations.
      </p>
      <Button size="sm" variant="primary" onClick={onReview}>
        Complete now
      </Button>
    </div>
  );
}
