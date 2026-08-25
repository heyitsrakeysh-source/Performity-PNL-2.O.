/**
 * ============================================================================
 * THE PROFITABILITY ENGINE
 * ============================================================================
 *
 * Every number the product shows is derived here from a single set of monthly
 * *drivers* (orders, per-order economics, fixed costs). Nothing is hardcoded
 * downstream, which means:
 *
 *   • the statement always foots — sub-lines sum to their totals, and totals
 *     roll into net profit exactly;
 *   • the what-if simulator is real arithmetic, not a canned result;
 *   • the waterfall's driver attribution is computed, not authored.
 *
 * ⚠️  PROTOTYPE DATA. Replace `MONTH_DRIVERS` with a real fetch — see
 *     /guide inside the app, and `lib/data/README` notes in the repo README.
 *     Keep `computeMonth()` as-is: it is the calculation contract the UI
 *     is written against.
 */

export type MonthKey = string; // "2026-08"

export interface FixedCosts {
  rent: number;
  salaries: number;
  software: number;
  other: number;
}

/** The raw inputs a brand actually controls or observes. */
export interface MonthDrivers {
  key: MonthKey;
  /** Delivered orders, net of cancellations. */
  orders: number;
  /** Net average order value (after returns & discounts). */
  netAov: number;
  cogsPerOrder: number;
  shippingPerOrder: number;
  packagingPerOrder: number;
  txnFeePerOrder: number;
  /** Blended customer acquisition cost per order. */
  cac: number;
  /** Returns + discounts as a share of gross revenue. */
  returnDiscountRate: number;
  /** Share of delivered orders that come back. */
  returnRate: number;
  fixed: FixedCosts;
  /** Share of revenue booked on Shopify (remainder is Amazon). */
  shopifyShare: number;
  /** Shipping charged to the customer, per order. */
  shippingIncomePerOrder: number;
  /** Non-ad marketing (agency retainers, influencer fees, tooling). */
  otherMarketing: number;
  tax: number;
}

/** The fully derived statement for one month. */
export interface MonthFigures {
  key: MonthKey;
  label: string; // "Aug 2026"
  shortLabel: string; // "Aug '26"
  year: number;
  monthIndex: number; // 0-11
  quarter: 1 | 2 | 3 | 4;
  drivers: MonthDrivers;

  orders: number;

  // Revenue block
  grossRevenue: number;
  returnsAndDiscounts: number;
  netSalesShopify: number;
  shippingIncomeShopify: number;
  salesAmazon: number;
  totalRevenue: number;

  // Cost of goods
  cogs: number;
  grossProfit: number;
  grossMarginPct: number;

  // Operational costs
  shipping: number;
  packaging: number;
  transactionFees: number;
  fixedCost: number;
  fixedBreakdown: FixedCosts;
  totalOperationalCosts: number;
  profitAfterOperationalCosts: number;

  // Marketing
  adSpend: number;
  otherMarketing: number;
  totalMarketing: number;
  profitAfterMarketing: number;

  // Bottom line
  tax: number;
  netProfit: number;
  netMarginPct: number;

  // Unit economics
  aov: number;
  cogsPerOrder: number;
  shippingPerOrder: number;
  packagingPerOrder: number;
  txnFeePerOrder: number;
  cac: number;
  fixedPerOrder: number;
  contributionPerOrder: number;
  contributionMarginPct: number;
  returnRate: number;

  // Efficiency
  roas: number;
  breakEvenRoas: number;
  /** CAC at which net profit per order would be exactly zero. */
  breakEvenCac: number;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/* ---------------------------------------------------------------------------
 * The calculation contract. Pure: drivers in, statement out.
 * ------------------------------------------------------------------------- */
export function computeMonth(d: MonthDrivers): MonthFigures {
  const [yearStr, monthStr] = d.key.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;

  const orders = d.orders;

  // --- revenue ---------------------------------------------------------
  const netMerchandise = orders * d.netAov;
  const shippingIncome = orders * d.shippingIncomePerOrder;
  const totalRevenue = netMerchandise + shippingIncome;
  const grossRevenue = netMerchandise / (1 - d.returnDiscountRate);
  const returnsAndDiscounts = grossRevenue - netMerchandise;

  const netSalesShopify = netMerchandise * d.shopifyShare;
  const shippingIncomeShopify = shippingIncome;
  const salesAmazon = netMerchandise * (1 - d.shopifyShare);

  // --- cost of goods ---------------------------------------------------
  const cogs = orders * d.cogsPerOrder;
  const grossProfit = totalRevenue - cogs;

  // --- operational -----------------------------------------------------
  const shipping = orders * d.shippingPerOrder;
  const packaging = orders * d.packagingPerOrder;
  const transactionFees = orders * d.txnFeePerOrder;
  const fixedCost = d.fixed.rent + d.fixed.salaries + d.fixed.software + d.fixed.other;
  const totalOperationalCosts = shipping + packaging + transactionFees + fixedCost;
  const profitAfterOperationalCosts = grossProfit - totalOperationalCosts;

  // --- marketing -------------------------------------------------------
  const adSpend = orders * d.cac;
  const totalMarketing = adSpend + d.otherMarketing;
  const profitAfterMarketing = profitAfterOperationalCosts - totalMarketing;

  // --- bottom line -----------------------------------------------------
  const netProfit = profitAfterMarketing - d.tax;

  // --- unit economics --------------------------------------------------
  const aov = totalRevenue / orders;
  const fixedPerOrder = fixedCost / orders;
  const contributionPerOrder =
    aov -
    d.cogsPerOrder -
    d.shippingPerOrder -
    d.packagingPerOrder -
    d.txnFeePerOrder -
    d.cac;

  // Break-even ROAS is the ROAS at which net profit would be exactly zero,
  // holding every other driver constant.
  const breakEvenAdSpend = adSpend + netProfit;
  const breakEvenRoas = breakEvenAdSpend > 0 ? totalRevenue / breakEvenAdSpend : Infinity;

  return {
    key: d.key,
    label: `${MONTH_NAMES[monthIndex]} ${year}`,
    shortLabel: `${MONTH_NAMES[monthIndex]} '${String(year).slice(2)}`,
    year,
    monthIndex,
    quarter: (Math.floor(monthIndex / 3) + 1) as 1 | 2 | 3 | 4,
    drivers: d,

    orders,

    grossRevenue,
    returnsAndDiscounts,
    netSalesShopify,
    shippingIncomeShopify,
    salesAmazon,
    totalRevenue,

    cogs,
    grossProfit,
    grossMarginPct: (grossProfit / totalRevenue) * 100,

    shipping,
    packaging,
    transactionFees,
    fixedCost,
    fixedBreakdown: d.fixed,
    totalOperationalCosts,
    profitAfterOperationalCosts,

    adSpend,
    otherMarketing: d.otherMarketing,
    totalMarketing,
    profitAfterMarketing,

    tax: d.tax,
    netProfit,
    netMarginPct: (netProfit / totalRevenue) * 100,

    aov,
    cogsPerOrder: d.cogsPerOrder,
    shippingPerOrder: d.shippingPerOrder,
    packagingPerOrder: d.packagingPerOrder,
    txnFeePerOrder: d.txnFeePerOrder,
    cac: d.cac,
    fixedPerOrder,
    contributionPerOrder,
    contributionMarginPct: (contributionPerOrder / aov) * 100,
    returnRate: d.returnRate * 100,

    roas: totalRevenue / adSpend,
    breakEvenRoas,
    breakEvenCac: d.cac + contributionPerOrder - fixedPerOrder,
  };
}

/* ---------------------------------------------------------------------------
 * DRIVER SERIES — 18 months, Mar 2025 → Aug 2026.
 *
 * The story encoded here: a brand that grew revenue steadily while its
 * acquisition cost crept from ₹548 to ₹764 an order, quietly eating a
 * 9% net margin down to a small loss. Every view in the product is a
 * different lens on that one movement.
 * ------------------------------------------------------------------------- */

interface Anchor {
  key: MonthKey;
  orders: number;
  netAov: number;
  cogsPerOrder: number;
  cac: number;
  shippingPerOrder: number;
  packagingPerOrder: number;
  txnFeePerOrder: number;
  returnRate: number;
  returnDiscountRate: number;
  fixedTotal: number;
  shopifyShare: number;
  otherMarketing: number;
}

const ANCHORS: Anchor[] = [
  { key: "2025-03", orders: 1892, netAov: 1912, cogsPerOrder: 748, cac: 592, shippingPerOrder: 121, packagingPerOrder: 36, txnFeePerOrder: 37, returnRate: 0.058, returnDiscountRate: 0.041, fixedTotal: 305700, shopifyShare: 0.93, otherMarketing: 42000 },
  { key: "2025-04", orders: 1974, netAov: 1904, cogsPerOrder: 745, cac: 597, shippingPerOrder: 122, packagingPerOrder: 36, txnFeePerOrder: 37, returnRate: 0.059, returnDiscountRate: 0.042, fixedTotal: 310900, shopifyShare: 0.93, otherMarketing: 44000 },
  { key: "2025-05", orders: 2036, netAov: 1898, cogsPerOrder: 743, cac: 599, shippingPerOrder: 123, packagingPerOrder: 37, txnFeePerOrder: 38, returnRate: 0.060, returnDiscountRate: 0.042, fixedTotal: 313500, shopifyShare: 0.92, otherMarketing: 46000 },
  { key: "2025-06", orders: 1948, netAov: 1889, cogsPerOrder: 744, cac: 590, shippingPerOrder: 124, packagingPerOrder: 37, txnFeePerOrder: 38, returnRate: 0.061, returnDiscountRate: 0.043, fixedTotal: 317800, shopifyShare: 0.92, otherMarketing: 46000 },
  { key: "2025-07", orders: 2044, netAov: 1884, cogsPerOrder: 742, cac: 589, shippingPerOrder: 124, packagingPerOrder: 37, txnFeePerOrder: 38, returnRate: 0.062, returnDiscountRate: 0.043, fixedTotal: 323000, shopifyShare: 0.92, otherMarketing: 48000 },
  { key: "2025-08", orders: 2118, netAov: 1880, cogsPerOrder: 741, cac: 583, shippingPerOrder: 124, packagingPerOrder: 38, txnFeePerOrder: 39, returnRate: 0.062, returnDiscountRate: 0.044, fixedTotal: 328300, shopifyShare: 0.92, otherMarketing: 48000 },
  // --- the trailing twelve months the product defaults to ---
  { key: "2025-09", orders: 2064, netAov: 1861, cogsPerOrder: 739, cac: 580, shippingPerOrder: 125, packagingPerOrder: 38, txnFeePerOrder: 39, returnRate: 0.063, returnDiscountRate: 0.044, fixedTotal: 331700, shopifyShare: 0.92, otherMarketing: 50000 },
  { key: "2025-10", orders: 2312, netAov: 1873, cogsPerOrder: 736, cac: 593, shippingPerOrder: 126, packagingPerOrder: 38, txnFeePerOrder: 39, returnRate: 0.064, returnDiscountRate: 0.045, fixedTotal: 336900, shopifyShare: 0.92, otherMarketing: 52000 },
  { key: "2025-11", orders: 2688, netAov: 1836, cogsPerOrder: 731, cac: 609, shippingPerOrder: 127, packagingPerOrder: 39, txnFeePerOrder: 39, returnRate: 0.066, returnDiscountRate: 0.049, fixedTotal: 343900, shopifyShare: 0.91, otherMarketing: 62000 },
  { key: "2025-12", orders: 2534, netAov: 1842, cogsPerOrder: 729, cac: 633, shippingPerOrder: 127, packagingPerOrder: 39, txnFeePerOrder: 39, returnRate: 0.068, returnDiscountRate: 0.048, fixedTotal: 349100, shopifyShare: 0.91, otherMarketing: 58000 },
  { key: "2026-01", orders: 2298, netAov: 1854, cogsPerOrder: 727, cac: 654, shippingPerOrder: 128, packagingPerOrder: 39, txnFeePerOrder: 39, returnRate: 0.070, returnDiscountRate: 0.047, fixedTotal: 363000, shopifyShare: 0.91, otherMarketing: 54000 },
  { key: "2026-02", orders: 2226, netAov: 1849, cogsPerOrder: 724, cac: 658, shippingPerOrder: 128, packagingPerOrder: 40, txnFeePerOrder: 39, returnRate: 0.072, returnDiscountRate: 0.047, fixedTotal: 368200, shopifyShare: 0.90, otherMarketing: 54000 },
  { key: "2026-03", orders: 2364, netAov: 1858, cogsPerOrder: 722, cac: 684, shippingPerOrder: 129, packagingPerOrder: 40, txnFeePerOrder: 39, returnRate: 0.074, returnDiscountRate: 0.048, fixedTotal: 375100, shopifyShare: 0.90, otherMarketing: 56000 },
  { key: "2026-04", orders: 2452, netAov: 1852, cogsPerOrder: 720, cac: 694, shippingPerOrder: 129, packagingPerOrder: 40, txnFeePerOrder: 39, returnRate: 0.077, returnDiscountRate: 0.049, fixedTotal: 383000, shopifyShare: 0.90, otherMarketing: 58000 },
  { key: "2026-05", orders: 2571, netAov: 1846, cogsPerOrder: 718, cac: 705, shippingPerOrder: 130, packagingPerOrder: 40, txnFeePerOrder: 39, returnRate: 0.079, returnDiscountRate: 0.049, fixedTotal: 389900, shopifyShare: 0.89, otherMarketing: 60000 },
  { key: "2026-06", orders: 2604, netAov: 1841, cogsPerOrder: 716, cac: 712, shippingPerOrder: 130, packagingPerOrder: 41, txnFeePerOrder: 39, returnRate: 0.081, returnDiscountRate: 0.050, fixedTotal: 396000, shopifyShare: 0.89, otherMarketing: 60000 },
  { key: "2026-07", orders: 2718, netAov: 1839, cogsPerOrder: 714, cac: 728, shippingPerOrder: 131, packagingPerOrder: 41, txnFeePerOrder: 39, returnRate: 0.083, returnDiscountRate: 0.050, fixedTotal: 402900, shopifyShare: 0.88, otherMarketing: 62000 },
  // Aug 2026 — the month the product opens on. Tuned so the statement foots to
  // a −₹18,640 net profit on 2,847 orders: the "small loss" the story explains.
  { key: "2026-08", orders: 2847, netAov: 1841.6, cogsPerOrder: 712, cac: 764, shippingPerOrder: 132, packagingPerOrder: 41, txnFeePerOrder: 39, returnRate: 0.086, returnDiscountRate: 0.051, fixedTotal: 409313, shopifyShare: 0.88, otherMarketing: 62000 },
];

/** Splits a fixed-cost total into its four standing line items. */
function splitFixed(total: number): FixedCosts {
  const rent = Math.round(total * 0.255);
  const salaries = Math.round(total * 0.545);
  const software = Math.round(total * 0.098);
  return { rent, salaries, software, other: total - rent - salaries - software };
}

export const MONTH_DRIVERS: MonthDrivers[] = ANCHORS.map((a) => ({
  key: a.key,
  orders: a.orders,
  netAov: a.netAov,
  cogsPerOrder: a.cogsPerOrder,
  shippingPerOrder: a.shippingPerOrder,
  packagingPerOrder: a.packagingPerOrder,
  txnFeePerOrder: a.txnFeePerOrder,
  cac: a.cac,
  returnDiscountRate: a.returnDiscountRate,
  returnRate: a.returnRate,
  fixed: splitFixed(a.fixedTotal),
  shopifyShare: a.shopifyShare,
  shippingIncomePerOrder: 5.4,
  otherMarketing: a.otherMarketing,
  tax: 0,
}));

export const MONTHS: MonthFigures[] = MONTH_DRIVERS.map(computeMonth);

export const MONTH_BY_KEY = new Map(MONTHS.map((m) => [m.key, m]));

/** The month the product opens on. */
export const CURRENT_KEY = "2026-08";
export const CURRENT = MONTH_BY_KEY.get(CURRENT_KEY)!;

/** The day-of-month the prototype pretends "today" is. */
export const TODAY_DAY = 24;
export const DAYS_IN_CURRENT_MONTH = 31;

export function priorMonth(key: MonthKey): MonthFigures | undefined {
  const i = MONTHS.findIndex((m) => m.key === key);
  return i > 0 ? MONTHS[i - 1] : undefined;
}

/* ---------------------------------------------------------------------------
 * Cost taxonomy — the fixed slot order behind every categorical chart.
 * Slot order is the CVD-safety mechanism, so it never changes and colours
 * follow the entity, never its current rank.
 * ------------------------------------------------------------------------- */
export const COST_CATEGORIES = [
  { id: "cogs", label: "COGS", slot: 1, get: (m: MonthFigures) => m.cogs },
  { id: "shipping", label: "Shipping", slot: 2, get: (m: MonthFigures) => m.shipping },
  { id: "packaging", label: "Packaging", slot: 3, get: (m: MonthFigures) => m.packaging },
  { id: "transaction", label: "Transaction fees", slot: 4, get: (m: MonthFigures) => m.transactionFees },
  { id: "adspend", label: "Ad spend", slot: 5, get: (m: MonthFigures) => m.totalMarketing },
  { id: "fixed", label: "Fixed cost", slot: 6, get: (m: MonthFigures) => m.fixedCost },
] as const;

export function seriesVar(slot: number) {
  return `var(--series-${slot})`;
}

/** Rupee-of-revenue breakdown, including the profit remainder. */
export function costBreakdown(m: MonthFigures) {
  const parts = COST_CATEGORIES.map((c) => ({
    id: c.id as string,
    label: c.label,
    slot: c.slot,
    value: c.get(m),
    share: (c.get(m) / m.totalRevenue) * 100,
    color: seriesVar(c.slot),
  }));
  return {
    parts,
    profit: {
      id: "profit",
      label: "Net profit",
      value: m.netProfit,
      share: m.netMarginPct,
      color: m.netProfit >= 0 ? "var(--good)" : "var(--critical)",
    },
  };
}
