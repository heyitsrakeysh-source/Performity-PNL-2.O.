/**
 * The metric catalogue behind the configurable tiles.
 *
 * One definition per metric, used by the overview tiles, the month-on-month
 * table and the quarter comparison, so a metric reads and formats identically
 * wherever it appears.
 */

import type { MonthFigures, QuarterFigures } from "./model";
import { money, moneyCompact, num, pct } from "../format";

export type MetricGroup = "Headline" | "Costs" | "Per order" | "Efficiency";

export interface MetricDef {
  id: string;
  label: string;
  group: MetricGroup;
  /** Reads from a month or an aggregated quarter. */
  get: (m: MonthFigures | QuarterFigures) => number;
  format: (v: number) => string;
  compact?: (v: number) => string;
  higherIsBetter: boolean;
  /** Rate metrics compare as a difference, not a ratio. */
  isRate?: boolean;
  /** What the number is, so a change is formatted in its own unit. */
  kind: "money" | "rate" | "count" | "ratio";
  info: string;
  color: string;
  /** Extra context under the headline number. */
  footnote?: (m: MonthFigures | QuarterFigures) => string;
}

export const METRICS: MetricDef[] = [
  {
    id: "revenue",
    kind: "money",
    label: "Total revenue",
    group: "Headline",
    get: (m) => m.totalRevenue,
    format: money,
    compact: moneyCompact,
    higherIsBetter: true,
    info: "Net sales plus shipping income, after returns and discounts.",
    color: "var(--brand)",
    footnote: (m) => `${num(m.orders)} orders at ${money(m.aov)} average order value`,
  },
  {
    id: "grossProfit",
    kind: "money",
    label: "Gross profit",
    group: "Headline",
    get: (m) => m.grossProfit,
    format: money,
    compact: moneyCompact,
    higherIsBetter: true,
    info: "Revenue less cost of goods sold.",
    color: "var(--series-3)",
    footnote: (m) => `${pct(m.grossMarginPct)} gross margin`,
  },
  {
    id: "netProfit",
    kind: "money",
    label: "Net profit",
    group: "Headline",
    get: (m) => m.netProfit,
    format: money,
    compact: money,
    higherIsBetter: true,
    info: "What is left after every cost, including fixed overhead.",
    color: "var(--critical)",
    footnote: (m) => `${pct(m.netMarginPct, 2)} of revenue, ${money(m.netProfit / m.orders)} per order`,
  },
  {
    id: "netMargin",
    kind: "rate",
    label: "Net margin",
    group: "Headline",
    get: (m) => m.netMarginPct,
    format: (v) => pct(v, 2),
    higherIsBetter: true,
    isRate: true,
    info: "Net profit as a share of revenue. Break-even is zero.",
    color: "var(--series-6)",
    footnote: (m) => `break-even needs ${money(Math.max(0, -m.netProfit))} more`,
  },
  {
    id: "grossMargin",
    kind: "rate",
    label: "Gross margin",
    group: "Headline",
    get: (m) => m.grossMarginPct,
    format: (v) => pct(v, 1),
    higherIsBetter: true,
    isRate: true,
    info: "Gross profit as a share of revenue.",
    color: "var(--series-3)",
    footnote: (m) => `COGS is ${money(m.cogsPerOrder)} of a ${money(m.aov)} order`,
  },
  {
    id: "orders",
    kind: "count",
    label: "Orders",
    group: "Headline",
    get: (m) => m.orders,
    format: num,
    higherIsBetter: true,
    info: "Delivered orders, net of cancellations.",
    color: "var(--brand)",
    footnote: (m) => `${money(m.contributionPerOrder)} contribution on each`,
  },

  {
    id: "cogs",
    kind: "money",
    label: "Cost of goods",
    group: "Costs",
    get: (m) => m.cogs,
    format: money,
    compact: moneyCompact,
    higherIsBetter: false,
    info: "Landed cost of everything sold in the period.",
    color: "var(--series-1)",
    footnote: (m) => `${pct((m.cogs / m.totalRevenue) * 100)} of revenue`,
  },
  {
    id: "marketing",
    kind: "money",
    label: "Marketing spend",
    group: "Costs",
    get: (m) => m.totalMarketing,
    format: money,
    compact: moneyCompact,
    higherIsBetter: false,
    info: "Paid media plus retainers and production.",
    color: "var(--series-5)",
    footnote: (m) => `ROAS ${m.roas.toFixed(2)} against break-even ${m.breakEvenRoas.toFixed(2)}`,
  },
  {
    id: "opcosts",
    kind: "money",
    label: "Operational costs",
    group: "Costs",
    get: (m) => m.totalOperationalCosts,
    format: money,
    compact: moneyCompact,
    higherIsBetter: false,
    info: "Shipping, packaging, transaction fees and fixed overhead.",
    color: "var(--series-2)",
    footnote: (m) => `${pct((m.totalOperationalCosts / m.totalRevenue) * 100)} of revenue`,
  },
  {
    id: "fixed",
    kind: "money",
    label: "Fixed cost",
    group: "Costs",
    get: (m) => m.fixedCost,
    format: money,
    compact: moneyCompact,
    higherIsBetter: false,
    info: "Standing monthly overhead: rent, salaries, software.",
    color: "var(--series-6)",
    footnote: (m) => `${money(m.fixedPerOrder)} per order at current volume`,
  },
  {
    id: "shipping",
    kind: "money",
    label: "Shipping cost",
    group: "Costs",
    get: (m) => m.shipping,
    format: money,
    compact: moneyCompact,
    higherIsBetter: false,
    info: "Courier charges billed by fulfilment partners.",
    color: "var(--series-2)",
    footnote: (m) => `${money(m.shippingPerOrder)} per parcel`,
  },

  {
    id: "aov",
    kind: "money",
    label: "Average order value",
    group: "Per order",
    get: (m) => m.aov,
    format: money,
    higherIsBetter: true,
    info: "Revenue divided by delivered orders.",
    color: "var(--brand)",
    footnote: (m) => `${num(m.orders)} orders this period`,
  },
  {
    id: "cac",
    kind: "money",
    label: "Acquisition cost",
    group: "Per order",
    get: (m) => m.cac,
    format: money,
    higherIsBetter: false,
    info: "Blended cost to acquire one order.",
    color: "var(--series-5)",
    footnote: (m) => `${pct((m.cac / m.aov) * 100)} of every order`,
  },
  {
    id: "contribution",
    kind: "money",
    label: "Contribution per order",
    group: "Per order",
    get: (m) => m.contributionPerOrder,
    format: money,
    higherIsBetter: true,
    info: "What one order leaves after goods, fulfilment, fees and acquisition, before overhead.",
    color: "var(--series-3)",
    footnote: (m) => `overhead then takes ${money(m.fixedPerOrder)}`,
  },
  {
    id: "cogsPerOrder",
    kind: "money",
    label: "COGS per order",
    group: "Per order",
    get: (m) => m.cogsPerOrder,
    format: money,
    higherIsBetter: false,
    info: "Landed product cost carried by one order.",
    color: "var(--series-1)",
    footnote: (m) => `${pct((m.cogsPerOrder / m.aov) * 100)} of the order value`,
  },

  {
    id: "roas",
    kind: "ratio",
    label: "Blended ROAS",
    group: "Efficiency",
    get: (m) => m.roas,
    format: (v) => `${v.toFixed(2)}x`,
    higherIsBetter: true,
    info: "Revenue divided by advertising spend, across all channels.",
    color: "var(--series-5)",
    footnote: (m) => `break-even sits at ${m.breakEvenRoas.toFixed(2)}x`,
  },
  {
    id: "breakEvenRoas",
    kind: "ratio",
    label: "Break-even ROAS",
    group: "Efficiency",
    get: (m) => m.breakEvenRoas,
    format: (v) => `${v.toFixed(2)}x`,
    higherIsBetter: false,
    info: "The return on ad spend at which net profit would be exactly zero.",
    color: "var(--series-4)",
    footnote: (m) => `currently running ${m.roas.toFixed(2)}x`,
  },
  {
    id: "returnRate",
    kind: "rate",
    label: "Return rate",
    group: "Efficiency",
    get: (m) => m.returnRate,
    format: (v) => pct(v, 1),
    higherIsBetter: false,
    isRate: true,
    info: "Share of delivered orders that come back.",
    color: "var(--series-2)",
    footnote: (m) => `${num(Math.round((m.returnRate / 100) * m.orders))} orders returned`,
  },
];

export const METRIC_BY_ID = new Map(METRICS.map((m) => [m.id, m]));

export function metric(id: string): MetricDef {
  return METRIC_BY_ID.get(id) ?? METRICS[0];
}

/** The tiles a new workspace opens on. */
export const DEFAULT_TILE_IDS = ["revenue", "grossProfit", "marketing", "netProfit"];

/** Rows in the month-on-month table. */
export const COMPARISON_ROW_IDS = [
  "revenue",
  "cogs",
  "grossProfit",
  "opcosts",
  "marketing",
  "netProfit",
  "netMargin",
  "orders",
  "aov",
  "cac",
  "contribution",
  "roas",
];
