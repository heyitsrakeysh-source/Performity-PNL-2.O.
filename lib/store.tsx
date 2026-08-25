"use client";

/**
 * Workspace store.
 *
 * Holds the driver overrides produced by the statement editor and the
 * what-if simulator, recomputes the whole month series from them, and
 * exposes the filter state the pages read. Because every page derives from
 * `months`, editing one input updates every card, chart and table at once.
 *
 * ⚠️  PROTOTYPE: state lives in memory for the session. See /guide for where
 *     to swap this for a server fetch + mutation (React Query / server
 *     actions against your own API).
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
  computeMonth,
  MONTH_DRIVERS,
  CURRENT_KEY,
  type MonthDrivers,
  type MonthFigures,
  type MonthKey,
} from "./data/model";
import { ALL_FIELDS, type Binding, type EditorField, type FlatField } from "./data/workspace";

/* ============================================================================
 * Types
 * ==========================================================================*/

export type Period = "3M" | "6M" | "12M" | "YTD";
export type Granularity = "monthly" | "quarterly";

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

export type Overrides = Record<MonthKey, DriverOverride>;
/** Manual inputs that have no model binding — tracked only for completeness. */
export type ManualValues = Record<MonthKey, Record<string, number | null>>;

interface WorkspaceValue {
  months: MonthFigures[];
  monthByKey: Map<MonthKey, MonthFigures>;
  current: MonthFigures;
  previous: MonthFigures;
  visibleMonths: MonthFigures[];

  period: Period;
  setPeriod: (p: Period) => void;
  granularity: Granularity;
  setGranularity: (g: Granularity) => void;
  channel: string;
  setChannel: (c: string) => void;
  isPending: boolean;

  overrides: Overrides;
  manualValues: ManualValues;
  fieldValue: (monthKey: MonthKey, field: EditorField) => number | null;
  commitEdits: (monthKey: MonthKey, changes: Record<string, number | null>) => void;
  /** Recompute a month as if `draft` had been saved — used for live preview. */
  previewMonth: (monthKey: MonthKey, draft: Record<string, number | null>) => MonthFigures;
  resetMonth: (monthKey: MonthKey) => void;
  editedCount: number;

  completeness: {
    total: number;
    filled: number;
    missing: number;
    pct: number;
    missingFields: FlatField[];
  };
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

/* ============================================================================
 * Binding helpers — translate between a monthly rupee total and a driver
 * ==========================================================================*/

/** The rupee total a bound field represents for a given month. */
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

/** Fold an edited rupee total back into a driver override. */
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
  return {
    ...base,
    ...rest,
    fixed: fixed ? { ...base.fixed, ...fixed } : base.fixed,
  };
}

/**
 * Deterministic stand-in for an input that a *closed* month would already
 * have. Prototype-only: in production these come from the database.
 */
function closedMonthFiller(fieldId: string, revenue: number) {
  let h = 0;
  for (let i = 0; i < fieldId.length; i++) h = (h * 31 + fieldId.charCodeAt(i)) % 9973;
  const share = 0.0008 + (h % 55) / 10000; // 0.08%–0.63% of revenue
  return Math.round((revenue * share) / 100) * 100;
}

/* ============================================================================
 * Provider
 * ==========================================================================*/

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Overrides>({});
  const [manualValues, setManualValues] = useState<ManualValues>({});
  const [period, setPeriodRaw] = useState<Period>("12M");
  const [granularity, setGranularityRaw] = useState<Granularity>("monthly");
  const [channel, setChannelRaw] = useState("all");
  const [isPending, startTransition] = useTransition();

  const months = useMemo(
    () => MONTH_DRIVERS.map((d) => computeMonth(applyOverride(d, overrides[d.key]))),
    [overrides],
  );

  const monthByKey = useMemo(() => new Map(months.map((m) => [m.key, m])), [months]);
  const current = monthByKey.get(CURRENT_KEY)!;
  const previous = months[months.length - 2];

  const visibleMonths = useMemo(() => {
    const n = period === "3M" ? 3 : period === "6M" ? 6 : period === "12M" ? 12 : current.monthIndex + 1;
    return months.slice(Math.max(0, months.length - n));
  }, [months, period, current.monthIndex]);

  /* --- field access ---------------------------------------------------- */

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
      // Closed months are complete: only the month in progress has gaps. A
      // stable hash keeps the filled-in value identical on server and client.
      if (field.seed === null && monthKey !== CURRENT_KEY) {
        const m = monthByKey.get(monthKey);
        return m ? closedMonthFiller(field.id, m.totalRevenue) : null;
      }
      return field.seed;
    },
    [manualValues, monthByKey],
  );

  /* --- mutations ------------------------------------------------------- */

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
          if (field.bind && value !== null) {
            writeBinding(field.bind, value, orders, nextOverride);
          } else {
            nextManual[fieldId] = value;
          }
        }

        setOverrides((prev) => ({ ...prev, [monthKey]: nextOverride }));
        setManualValues((prev) => ({ ...prev, [monthKey]: nextManual }));
      });
    },
    [monthByKey, overrides, manualValues],
  );

  const resetMonth = useCallback((monthKey: MonthKey) => {
    startTransition(() => {
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[monthKey];
        return next;
      });
      setManualValues((prev) => {
        const next = { ...prev };
        delete next[monthKey];
        return next;
      });
    });
  }, []);

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

  /* --- completeness ---------------------------------------------------- */

  const completeness = useMemo(() => {
    const fields = ALL_FIELDS;
    const missingFields = fields.filter((f) => fieldValue(CURRENT_KEY, f) === null);
    const total = fields.length;
    const missing = missingFields.length;
    const filled = total - missing;
    return { total, filled, missing, pct: (filled / total) * 100, missingFields };
  }, [fieldValue]);

  /* --- filter setters run in a transition so charts hold their render --- */

  const setPeriod = useCallback((p: Period) => startTransition(() => setPeriodRaw(p)), []);
  const setGranularity = useCallback((g: Granularity) => startTransition(() => setGranularityRaw(g)), []);
  const setChannel = useCallback((c: string) => startTransition(() => setChannelRaw(c)), []);

  const value: WorkspaceValue = {
    months,
    monthByKey,
    current,
    previous,
    visibleMonths,
    period,
    setPeriod,
    granularity,
    setGranularity,
    channel,
    setChannel,
    isPending,
    overrides,
    manualValues,
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
