"use client";

/**
 * Workspace store.
 *
 * The single place the product reads data from. It owns:
 *   - which brand is active (each has its own driver series)
 *   - the date range every chart and table is scoped to
 *   - the comparison period every delta in the app is measured against
 *   - driver overrides produced by the statement editor and the simulator
 *
 * Everything downstream derives from `months`, so changing a filter, switching
 * brand or editing an input updates every figure at once.
 *
 * PROTOTYPE: state lives in memory for the session. See /guide for where to
 * swap this for a server fetch plus mutations.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  aggregateQuarters,
  computeMonth,
  CURRENT_KEY,
  DEFAULT_BRAND_ID,
  driversForBrand,
  brandProfile,
  resolveRange,
  type BrandProfile,
  type MonthDrivers,
  type MonthFigures,
  type MonthKey,
  type QuarterFigures,
  type RangePresetId,
} from "./data/model";
import { ALL_FIELDS, type Binding, type EditorField } from "./data/workspace";

/* ============================================================================
 * Types
 * ==========================================================================*/

export type Granularity = "monthly" | "quarterly";
export type CompareMode = "prev" | "prevQuarter" | "lastYear" | "custom";

export interface DateRange {
  from: MonthKey;
  to: MonthKey;
}

export interface DriverOverride {
  netAov?: number;
  shippingIncomePerOrder?: number;
  cogsPerOrder?: number;
  shippingPerOrder?: number;
  packagingPerOrder?: number;
  txnFeePerOrder?: number;
  cac?: number;
  otherMarketing?: number;
  tax?: number;
  fixed?: Partial<MonthDrivers["fixed"]>;
}

type Overrides = Record<MonthKey, DriverOverride>;
type ManualValues = Record<MonthKey, Record<string, number | null>>;

export const COMPARE_MODES: { id: CompareMode; label: string; short: string }[] = [
  { id: "prev", label: "Previous month", short: "MoM" },
  { id: "prevQuarter", label: "Same month, previous quarter", short: "QoQ" },
  { id: "lastYear", label: "Same month, last year", short: "YoY" },
  { id: "custom", label: "A specific month", short: "Custom" },
];

interface WorkspaceValue {
  /* --- brand --- */
  brand: BrandProfile;
  brandId: string;
  setBrandId: (id: string) => void;

  /* --- series --- */
  months: MonthFigures[];
  monthByKey: Map<MonthKey, MonthFigures>;
  visibleMonths: MonthFigures[];
  quarters: QuarterFigures[];

  /** The month every headline figure describes: the last month in range. */
  current: MonthFigures;
  /** The period every delta is measured against. */
  comparison: MonthFigures;
  /** "vs Jan 2026" */
  comparisonLabel: string;
  /** The strongest month in range, for "best ever" style framing. */
  bestMonth: MonthFigures;
  worstMonth: MonthFigures;

  /* --- filters --- */
  range: DateRange;
  setRange: (r: DateRange) => void;
  rangePreset: RangePresetId;
  setRangePreset: (p: RangePresetId) => void;
  compareMode: CompareMode;
  compareKey: MonthKey;
  setCompareMode: (m: CompareMode) => void;
  setCompareKey: (k: MonthKey) => void;
  granularity: Granularity;
  setGranularity: (g: Granularity) => void;
  channel: string;
  setChannel: (c: string) => void;
  isPending: boolean;

  /* --- edits --- */
  fieldValue: (monthKey: MonthKey, field: EditorField) => number | null;
  commitEdits: (monthKey: MonthKey, changes: Record<string, number | null>) => void;
  previewMonth: (monthKey: MonthKey, draft: Record<string, number | null>) => MonthFigures;
  resetMonth: (monthKey: MonthKey) => void;
  editedCount: number;

  completeness: {
    total: number;
    filled: number;
    missing: number;
    pct: number;
    missingFields: EditorField[];
  };
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

/* ============================================================================
 * Binding helpers: translate between a monthly rupee total and a driver
 * ==========================================================================*/

export function readBinding(bind: Binding, d: MonthDrivers): number | null {
  if (!bind) return null;
  if (bind.kind === "perOrder") {
    const v = d[bind.driver];
    return typeof v === "number" ? v * d.orders : null;
  }
  if (bind.kind === "absolute") {
    const v = d[bind.driver];
    return typeof v === "number" ? v : null;
  }
  return d.fixed[bind.part];
}

function writeBinding(bind: Binding, total: number, orders: number, into: DriverOverride) {
  if (!bind) return;
  if (bind.kind === "perOrder") {
    (into as Record<string, unknown>)[bind.driver as string] = total / orders;
  } else if (bind.kind === "absolute") {
    (into as Record<string, unknown>)[bind.driver as string] = total;
  } else {
    into.fixed = { ...into.fixed, [bind.part]: total };
  }
}

function applyOverride(base: MonthDrivers, o: DriverOverride | undefined): MonthDrivers {
  if (!o) return base;
  const { fixed, ...rest } = o;
  return { ...base, ...rest, fixed: fixed ? { ...base.fixed, ...fixed } : base.fixed };
}

/**
 * Deterministic stand-in for an input a closed month would already have.
 * Prototype only: in production these come from the database.
 */
function closedMonthFiller(fieldId: string, revenue: number) {
  let h = 0;
  for (let i = 0; i < fieldId.length; i++) h = (h * 31 + fieldId.charCodeAt(i)) % 9973;
  const share = 0.0008 + (h % 55) / 10000;
  return Math.round((revenue * share) / 100) * 100;
}

/* ============================================================================
 * Provider
 * ==========================================================================*/

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [brandId, setBrandIdRaw] = useState(DEFAULT_BRAND_ID);
  const [overridesByBrand, setOverridesByBrand] = useState<Record<string, Overrides>>({});
  const [manualByBrand, setManualByBrand] = useState<Record<string, ManualValues>>({});

  const [rangePreset, setRangePresetRaw] = useState<RangePresetId>("last12");
  const [range, setRangeRaw] = useState<DateRange>(() => resolveRange("last12"));
  const [compareMode, setCompareModeRaw] = useState<CompareMode>("prev");
  const [customCompareKey, setCustomCompareKey] = useState<MonthKey | null>(null);
  const [granularity, setGranularityRaw] = useState<Granularity>("monthly");
  const [channel, setChannelRaw] = useState("all");
  const [isPending, startTransition] = useTransition();

  const brand = brandProfile(brandId);
  const overrides = overridesByBrand[brandId] ?? {};
  const manualValues = manualByBrand[brandId] ?? {};

  const months = useMemo(
    () => driversForBrand(brandId).map((d) => computeMonth(applyOverride(d, overrides[d.key]))),
    [brandId, overrides],
  );

  const monthByKey = useMemo(() => new Map(months.map((m) => [m.key, m])), [months]);

  const visibleMonths = useMemo(() => {
    const start = months.findIndex((m) => m.key === range.from);
    const end = months.findIndex((m) => m.key === range.to);
    if (start === -1 || end === -1 || end < start) return months.slice(-12);
    return months.slice(start, end + 1);
  }, [months, range]);

  const quarters = useMemo(() => aggregateQuarters(visibleMonths), [visibleMonths]);

  const current = visibleMonths[visibleMonths.length - 1] ?? monthByKey.get(CURRENT_KEY) ?? months[months.length - 1];

  /* --- comparison: an explicit month, resolvable from a preset ------------ */

  const compareKey = useMemo(() => {
    const idx = months.findIndex((m) => m.key === current.key);
    const at = (offset: number) => months[Math.max(0, idx - offset)]?.key ?? months[0].key;
    switch (compareMode) {
      case "prev":
        return at(1);
      case "prevQuarter":
        return at(3);
      case "lastYear":
        return at(12);
      case "custom":
        return customCompareKey && monthByKey.has(customCompareKey) ? customCompareKey : at(1);
    }
  }, [months, monthByKey, current.key, compareMode, customCompareKey]);

  const comparison = monthByKey.get(compareKey) ?? months[0];
  const comparisonLabel = `vs ${comparison.label}`;

  const bestMonth = useMemo(
    () => visibleMonths.reduce((a, b) => (b.netMarginPct > a.netMarginPct ? b : a), visibleMonths[0] ?? current),
    [visibleMonths, current],
  );
  const worstMonth = useMemo(
    () => visibleMonths.reduce((a, b) => (b.netMarginPct < a.netMarginPct ? b : a), visibleMonths[0] ?? current),
    [visibleMonths, current],
  );

  /* --- field access ------------------------------------------------------ */

  const fieldValue = useCallback(
    (monthKey: MonthKey, field: EditorField): number | null => {
      const manual = manualValues[monthKey]?.[field.id];
      if (manual !== undefined) return manual;
      if (field.bind) {
        const m = monthByKey.get(monthKey);
        return m ? readBinding(field.bind, m.drivers) : null;
      }
      if (field.derive) {
        const m = monthByKey.get(monthKey);
        if (!m) return null;
        switch (field.derive) {
          case "grossRevenue":
            return m.grossRevenue;
          case "returnsAndDiscounts":
            return -m.returnsAndDiscounts;
          case "salesAmazon":
            return m.salesAmazon;
          case "netMerchandise":
            return m.netSalesShopify;
        }
      }
      // Closed months are complete: only the month in progress has gaps.
      if (field.seed === null && monthKey !== current.key) {
        const m = monthByKey.get(monthKey);
        return m ? closedMonthFiller(field.id, m.totalRevenue) : null;
      }
      return field.seed;
    },
    [manualValues, monthByKey, current.key],
  );

  /* --- mutations --------------------------------------------------------- */

  const commitEdits = useCallback(
    (monthKey: MonthKey, changes: Record<string, number | null>) => {
      startTransition(() => {
        const month = monthByKey.get(monthKey);
        if (!month) return;
        const orders = month.orders;

        const nextOverride: DriverOverride = { ...(overrides[monthKey] ?? {}) };
        const nextManual: Record<string, number | null> = { ...(manualValues[monthKey] ?? {}) };

        for (const [fieldId, value] of Object.entries(changes)) {
          const field = ALL_FIELDS.find((f) => f.id === fieldId);
          if (!field || field.readOnly) continue;
          if (field.bind && value !== null) writeBinding(field.bind, value, orders, nextOverride);
          else nextManual[fieldId] = value;
        }

        setOverridesByBrand((prev) => ({
          ...prev,
          [brandId]: { ...(prev[brandId] ?? {}), [monthKey]: nextOverride },
        }));
        setManualByBrand((prev) => ({
          ...prev,
          [brandId]: { ...(prev[brandId] ?? {}), [monthKey]: nextManual },
        }));
      });
    },
    [monthByKey, overrides, manualValues, brandId],
  );

  const previewMonth = useCallback(
    (monthKey: MonthKey, draft: Record<string, number | null>): MonthFigures => {
      const base = monthByKey.get(monthKey)!;
      const override: DriverOverride = {};
      for (const [fieldId, value] of Object.entries(draft)) {
        if (value === null) continue;
        const field = ALL_FIELDS.find((f) => f.id === fieldId);
        if (!field?.bind || field.readOnly) continue;
        writeBinding(field.bind, value, base.orders, override);
      }
      return computeMonth(applyOverride(base.drivers, override));
    },
    [monthByKey],
  );

  const resetMonth = useCallback(
    (monthKey: MonthKey) => {
      startTransition(() => {
        setOverridesByBrand((prev) => {
          const forBrand = { ...(prev[brandId] ?? {}) };
          delete forBrand[monthKey];
          return { ...prev, [brandId]: forBrand };
        });
        setManualByBrand((prev) => {
          const forBrand = { ...(prev[brandId] ?? {}) };
          delete forBrand[monthKey];
          return { ...prev, [brandId]: forBrand };
        });
      });
    },
    [brandId],
  );

  const editedCount = useMemo(() => {
    let n = 0;
    for (const key of Object.keys(overrides)) {
      const o = overrides[key];
      n += Object.keys(o).filter((k) => k !== "fixed").length;
      if (o.fixed) n += Object.keys(o.fixed).length;
    }
    for (const key of Object.keys(manualValues)) {
      n += Object.values(manualValues[key]).filter((v) => v !== null).length;
    }
    return n;
  }, [overrides, manualValues]);

  const completeness = useMemo(() => {
    const missingFields = ALL_FIELDS.filter((f) => fieldValue(current.key, f) === null);
    const total = ALL_FIELDS.length;
    const missing = missingFields.length;
    return {
      total,
      filled: total - missing,
      missing,
      pct: ((total - missing) / total) * 100,
      missingFields,
    };
  }, [fieldValue, current.key]);

  /* --- setters ----------------------------------------------------------- */

  const setBrandId = useCallback((id: string) => startTransition(() => setBrandIdRaw(id)), []);
  const setRange = useCallback((r: DateRange) => {
    startTransition(() => {
      setRangeRaw(r);
      setRangePresetRaw("custom");
    });
  }, []);
  const setRangePreset = useCallback((p: RangePresetId) => {
    startTransition(() => {
      setRangePresetRaw(p);
      if (p !== "custom") setRangeRaw(resolveRange(p));
    });
  }, []);
  const setCompareMode = useCallback((m: CompareMode) => startTransition(() => setCompareModeRaw(m)), []);
  const setCompareKey = useCallback((k: MonthKey) => {
    startTransition(() => {
      setCustomCompareKey(k);
      setCompareModeRaw("custom");
    });
  }, []);
  const setGranularity = useCallback((g: Granularity) => startTransition(() => setGranularityRaw(g)), []);
  const setChannel = useCallback((c: string) => startTransition(() => setChannelRaw(c)), []);

  const value: WorkspaceValue = {
    brand,
    brandId,
    setBrandId,
    months,
    monthByKey,
    visibleMonths,
    quarters,
    current,
    comparison,
    comparisonLabel,
    bestMonth,
    worstMonth,
    range,
    setRange,
    rangePreset,
    setRangePreset,
    compareMode,
    compareKey,
    setCompareMode,
    setCompareKey,
    granularity,
    setGranularity,
    channel,
    setChannel,
    isPending,
    fieldValue,
    commitEdits,
    previewMonth,
    resetMonth,
    editedCount,
    completeness,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return ctx;
}
