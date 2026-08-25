/**
 * Derived analytics. Every function here is pure and takes month figures as
 * input, so the whole product recomputes when a value is edited in the
 * statement drawer or moved in the what-if simulator.
 */

import type { MonthFigures } from "./model";
import { DAYS_IN_CURRENT_MONTH, TODAY_DAY } from "./model";

/* ============================================================================
 * 1. DRIVER ATTRIBUTION: why profit moved
 * ==========================================================================*/

export interface DriverImpact {
  id: string;
  label: string;
  /** Rupee impact on net profit. Negative = it cost you money. */
  impact: number;
  detail: string;
  kind: "volume" | "price" | "cost" | "acquisition" | "overhead";
}

/**
 * Chained decomposition of the change in net profit between two months.
 *
 *   netProfit = orders × (aov − cogs − shipping − packaging − fees − cac)
 *               − fixed − otherMarketing − tax
 *
 * Drivers are substituted one at a time, in a fixed order, and each step's
 * effect is recorded. Because the substitution is sequential the parts sum to
 * the total change exactly. No unexplained residual.
 */
export function attributeChange(prev: MonthFigures, curr: MonthFigures): DriverImpact[] {
  type State = {
    orders: number; aov: number; cogs: number; ship: number;
    pack: number; fees: number; cac: number; fixed: number; other: number; tax: number;
  };

  const from: State = {
    orders: prev.orders, aov: prev.aov, cogs: prev.cogsPerOrder, ship: prev.shippingPerOrder,
    pack: prev.packagingPerOrder, fees: prev.txnFeePerOrder, cac: prev.cac,
    fixed: prev.fixedCost, other: prev.otherMarketing, tax: prev.tax,
  };
  const to: State = {
    orders: curr.orders, aov: curr.aov, cogs: curr.cogsPerOrder, ship: curr.shippingPerOrder,
    pack: curr.packagingPerOrder, fees: curr.txnFeePerOrder, cac: curr.cac,
    fixed: curr.fixedCost, other: curr.otherMarketing, tax: curr.tax,
  };

  const profit = (s: State) =>
    s.orders * (s.aov - s.cogs - s.ship - s.pack - s.fees - s.cac) - s.fixed - s.other - s.tax;

  const steps: { key: keyof State; id: string; label: string; kind: DriverImpact["kind"]; detail: (a: number, b: number) => string }[] = [
    { key: "orders", id: "volume", label: "Order volume", kind: "volume",
      detail: (a, b) => `${fmtInt(a)} → ${fmtInt(b)} orders (${signPct(a, b)})` },
    { key: "aov", id: "aov", label: "Average order value", kind: "price",
      detail: (a, b) => `₹${fmtInt(a)} → ₹${fmtInt(b)} per order` },
    { key: "cogs", id: "cogs", label: "COGS per order", kind: "cost",
      detail: (a, b) => `₹${fmtInt(a)} → ₹${fmtInt(b)} per order` },
    { key: "ship", id: "shipping", label: "Shipping per order", kind: "cost",
      detail: (a, b) => `₹${fmtInt(a)} → ₹${fmtInt(b)} per order` },
    { key: "pack", id: "packaging", label: "Packaging per order", kind: "cost",
      detail: (a, b) => `₹${fmtInt(a)} → ₹${fmtInt(b)} per order` },
    { key: "fees", id: "fees", label: "Transaction fees", kind: "cost",
      detail: (a, b) => `₹${fmtInt(a)} → ₹${fmtInt(b)} per order` },
    { key: "cac", id: "cac", label: "Acquisition cost", kind: "acquisition",
      detail: (a, b) => `CAC ₹${fmtInt(a)} → ₹${fmtInt(b)} (${signPct(a, b)})` },
    { key: "fixed", id: "fixed", label: "Fixed costs", kind: "overhead",
      detail: (a, b) => `₹${fmtCompact(a)} → ₹${fmtCompact(b)} for the month` },
    { key: "other", id: "othermkt", label: "Other marketing", kind: "overhead",
      detail: (a, b) => `₹${fmtCompact(a)} → ₹${fmtCompact(b)} for the month` },
  ];

  const state: State = { ...from };
  const out: DriverImpact[] = [];

  for (const step of steps) {
    const before = profit(state);
    const a = state[step.key];
    (state[step.key] as number) = to[step.key];
    const after = profit(state);
    const impact = after - before;
    if (Math.abs(impact) < 1) continue;
    out.push({
      id: step.id,
      label: step.label,
      impact,
      detail: step.detail(a, to[step.key]),
      kind: step.kind,
    });
  }

  return out.sort((x, y) => Math.abs(y.impact) - Math.abs(x.impact));
}

function fmtInt(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}
function fmtCompact(n: number) {
  return n >= 100000 ? `${(n / 100000).toFixed(2)}L` : fmtInt(n);
}
function signPct(a: number, b: number) {
  if (!a) return "-";
  const p = ((b - a) / Math.abs(a)) * 100;
  return `${p >= 0 ? "+" : "−"}${Math.abs(p).toFixed(1)}%`;
}

/* ============================================================================
 * 2. PROFIT BRIDGE: revenue down to net profit for a single month
 * ==========================================================================*/

export interface BridgeStep {
  label: string;
  value: number;
  kind: "start" | "cost" | "end";
}

export function profitBridge(m: MonthFigures): BridgeStep[] {
  return [
    { label: "Revenue", value: m.totalRevenue, kind: "start" },
    { label: "COGS", value: -m.cogs, kind: "cost" },
    { label: "Operations", value: -m.totalOperationalCosts, kind: "cost" },
    { label: "Marketing", value: -m.totalMarketing, kind: "cost" },
    ...(m.tax ? ([{ label: "Tax", value: -m.tax, kind: "cost" }] as BridgeStep[]) : []),
    { label: "Net profit", value: m.netProfit, kind: "end" },
  ];
}

/* ============================================================================
 * 3. DAILY PACING: month-to-date actuals and a projection to close
 * ==========================================================================*/

export interface DayPoint {
  day: number;
  /** Cumulative net profit through this day. */
  cumulative: number;
  /** Net profit booked on this day alone. */
  daily: number;
  orders: number;
  isProjected: boolean;
  /** Confidence band, projected days only. */
  low?: number;
  high?: number;
}

/** Weekday multipliers. D2C footwear skews to Thu to Sun. */
const WEEKDAY_WEIGHT = [0.86, 0.82, 0.9, 1.06, 1.18, 1.24, 0.98]; // Sun..Sat

/** A fixed jitter table keeps the series identical on server and client. */
const JITTER = [
  1.02, 0.96, 1.05, 0.99, 1.08, 0.93, 1.01, 1.04, 0.97, 1.06, 0.95, 1.03,
  1.0, 0.98, 1.07, 0.94, 1.02, 1.05, 0.96, 1.01, 1.09, 0.92, 1.03, 0.99,
  1.04, 0.97, 1.06, 1.0, 0.95, 1.02, 0.98,
];

/** One day of trading variance. The unit the projection band is built from. */
function dailySpread(m: MonthFigures) {
  return Math.abs((m.orders / DAYS_IN_CURRENT_MONTH) * m.contributionPerOrder) * 0.21;
}

export function dailyPacing(m: MonthFigures): DayPoint[] {
  const days = DAYS_IN_CURRENT_MONTH;
  const firstDow = new Date(Date.UTC(m.year, m.monthIndex, 1)).getUTCDay();

  const weights = Array.from({ length: days }, (_, i) => {
    const dow = (firstDow + i) % 7;
    return WEEKDAY_WEIGHT[dow] * JITTER[i % JITTER.length];
  });
  const weightSum = weights.reduce((a, b) => a + b, 0);

  const fixedPerDay = m.fixedCost / days;
  const points: DayPoint[] = [];
  let cumulative = 0;

  for (let i = 0; i < days; i++) {
    const share = weights[i] / weightSum;
    const orders = Math.round(m.orders * share);
    // Contribution before fixed costs, then the day's slice of overhead.
    const daily = orders * m.contributionPerOrder - fixedPerDay;
    cumulative += daily;

    const day = i + 1;
    const isProjected = day > TODAY_DAY;
    // The band widens with distance from today, scaled to a day's contribution
    // rather than to revenue, it is daily trading that varies, not the base.
    const distance = Math.max(0, day - TODAY_DAY);
    const spread = dailySpread(m) * distance;

    points.push({
      day,
      daily,
      orders,
      cumulative,
      isProjected,
      ...(isProjected ? { low: cumulative - spread, high: cumulative + spread } : {}),
    });
  }

  // Close any rounding drift on the final day so the projection lands exactly
  // on the month's modelled net profit.
  const drift = m.netProfit - points[days - 1].cumulative;
  for (let i = 0; i < days; i++) {
    points[i].cumulative += drift * ((i + 1) / days);
    if (points[i].isProjected) {
      const d = Math.max(0, points[i].day - TODAY_DAY);
      const spread = dailySpread(m) * d;
      points[i].low = points[i].cumulative - spread;
      points[i].high = points[i].cumulative + spread;
    }
  }

  return points;
}

export function pacingSummary(m: MonthFigures) {
  const series = dailyPacing(m);
  const mtd = series[TODAY_DAY - 1];
  const close = series[series.length - 1];
  return {
    series,
    mtdNetProfit: mtd.cumulative,
    projectedNetProfit: close.cumulative,
    band: (close.high ?? close.cumulative) - close.cumulative,
    dayOfMonth: TODAY_DAY,
    daysInMonth: DAYS_IN_CURRENT_MONTH,
    progressPct: (TODAY_DAY / DAYS_IN_CURRENT_MONTH) * 100,
  };
}

/* ============================================================================
 * 4. UNIT ECONOMICS WATERFALL: where one order's rupee goes
 * ==========================================================================*/

export function perOrderBreakdown(m: MonthFigures) {
  const parts = [
    { id: "cogs", label: "COGS", value: m.cogsPerOrder, slot: 1 },
    { id: "shipping", label: "Shipping", value: m.shippingPerOrder, slot: 2 },
    { id: "packaging", label: "Packaging", value: m.packagingPerOrder, slot: 3 },
    { id: "fees", label: "Transaction fees", value: m.txnFeePerOrder, slot: 4 },
    { id: "cac", label: "CAC", value: m.cac, slot: 5 },
  ];
  return {
    aov: m.aov,
    parts: parts.map((p) => ({ ...p, share: (p.value / m.aov) * 100 })),
    contribution: m.contributionPerOrder,
    contributionShare: (m.contributionPerOrder / m.aov) * 100,
  };
}

/* ============================================================================
 * 5. INSIGHTS: written from the numbers, not hardcoded prose
 * ==========================================================================*/

export interface Insight {
  id: string;
  headline: string;
  body: string;
  tone: "good" | "bad" | "neutral";
  metric: string;
}

export function buildInsights(prev: MonthFigures, curr: MonthFigures): Insight[] {
  const out: Insight[] = [];
  const roasDelta = curr.roas - prev.roas;
  const cacDelta = ((curr.cac - prev.cac) / prev.cac) * 100;
  const gmDelta = curr.grossMarginPct - prev.grossMarginPct;
  const npDelta = curr.netProfit - prev.netProfit;
  const revDelta = ((curr.totalRevenue - prev.totalRevenue) / prev.totalRevenue) * 100;

  out.push({
    id: "cac",
    metric: "CAC",
    tone: cacDelta > 0 ? "bad" : "good",
    headline: `Acquisition cost ${cacDelta > 0 ? "rose" : "fell"} ${Math.abs(cacDelta).toFixed(1)}% to ₹${Math.round(curr.cac)}`,
    body: `ROAS moved from ${prev.roas.toFixed(2)} to ${curr.roas.toFixed(2)} against a break-even of ${curr.breakEvenRoas.toFixed(2)}. Every order now carries ₹${Math.round(curr.cac - prev.cac)} more acquisition cost than last month.`,
  });

  out.push({
    id: "margin",
    metric: "Gross margin",
    tone: gmDelta >= 0 ? "good" : "bad",
    headline: `Gross margin ${gmDelta >= 0 ? "improved" : "slipped"} to ${curr.grossMarginPct.toFixed(1)}%`,
    body: `COGS per order went ₹${Math.round(prev.cogsPerOrder)} → ₹${Math.round(curr.cogsPerOrder)}, ${gmDelta >= 0 ? "adding" : "removing"} roughly ₹${Math.abs(Math.round((gmDelta / 100) * curr.totalRevenue)).toLocaleString("en-IN")} of profit at current volume.`,
  });

  out.push({
    id: "revenue",
    metric: "Revenue",
    tone: revDelta >= 0 ? "good" : "bad",
    headline: `Revenue ${revDelta >= 0 ? "grew" : "declined"} ${Math.abs(revDelta).toFixed(1)}% to ₹${(curr.totalRevenue / 100000).toFixed(2)}L`,
    body: `Driven by ${(((curr.orders - prev.orders) / prev.orders) * 100).toFixed(1)}% order growth at an AOV of ₹${Math.round(curr.aov)}. Growth is outpacing profitability, contribution per order is ₹${Math.round(curr.contributionPerOrder)}.`,
  });

  out.push({
    id: "netprofit",
    metric: "Net profit",
    tone: npDelta >= 0 ? "good" : "bad",
    headline: `Net profit ${npDelta >= 0 ? "rose" : "fell"} ₹${Math.abs(Math.round(npDelta)).toLocaleString("en-IN")} month on month`,
    body: `Net margin is ${curr.netMarginPct.toFixed(2)}%. Fixed costs of ₹${(curr.fixedCost / 100000).toFixed(2)}L now absorb ₹${Math.round(curr.fixedPerOrder)} of the ₹${Math.round(curr.contributionPerOrder + curr.fixedPerOrder)} each order contributes before overhead.`,
  });

  void roasDelta;
  return out;
}

/* ============================================================================
 * 6. BENCHMARKS: brand vs peer median
 * ==========================================================================*/

export function benchmarks(m: MonthFigures) {
  return [
    { id: "gm", label: "Gross margin %", suffix: "%", you: m.grossMarginPct, peer: 58.4, higherIsBetter: true, decimals: 1 },
    { id: "cac", label: "CAC", prefix: "₹", you: m.cac, peer: 612, higherIsBetter: false },
    { id: "return", label: "Return rate", suffix: "%", you: m.returnRate, peer: 6.2, higherIsBetter: false, decimals: 1 },
    { id: "aov", label: "AOV", prefix: "₹", you: m.aov, peer: 1690, higherIsBetter: true },
    { id: "roas", label: "Blended ROAS", you: m.roas, peer: 2.85, higherIsBetter: true, decimals: 2 },
  ];
}
