/**
 * ============================================================================
 * THE PROFITABILITY ENGINE
 * ============================================================================
 *
 * Every number the product shows is derived here from a single set of monthly
 * *drivers* (orders, per-order economics, fixed costs). Nothing is hardcoded
 * downstream, which means:
 *
 *   • the statement always foots, sub-lines sum to their totals, and totals
 *     roll into net profit exactly;
 *   • the what-if simulator is real arithmetic, not a canned result;
 *   • the waterfall's driver attribution is computed, not authored.
 *
 * ⚠️  PROTOTYPE DATA. Replace `MONTH_DRIVERS` with a real fetch. See
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
 * DRIVER SERIES: 18 months, Mar 2025 → Aug 2026.
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
  { key: "2024-09", orders: 1620, netAov: 1935, cogsPerOrder: 756, cac: 603, shippingPerOrder: 118, packagingPerOrder: 35, txnFeePerOrder: 36, returnRate: 0.052, returnDiscountRate: 0.039, fixedTotal: 246000, shopifyShare: 0.94, otherMarketing: 38000 },
  { key: "2024-10", orders: 1740, netAov: 1928, cogsPerOrder: 754, cac: 611, shippingPerOrder: 119, packagingPerOrder: 35, txnFeePerOrder: 36, returnRate: 0.053, returnDiscountRate: 0.039, fixedTotal: 249000, shopifyShare: 0.94, otherMarketing: 40000 },
  { key: "2024-11", orders: 2050, netAov: 1902, cogsPerOrder: 750, cac: 635, shippingPerOrder: 120, packagingPerOrder: 36, txnFeePerOrder: 36, returnRate: 0.055, returnDiscountRate: 0.043, fixedTotal: 253000, shopifyShare: 0.93, otherMarketing: 48000 },
  { key: "2024-12", orders: 1980, netAov: 1910, cogsPerOrder: 749, cac: 646, shippingPerOrder: 120, packagingPerOrder: 36, txnFeePerOrder: 37, returnRate: 0.056, returnDiscountRate: 0.042, fixedTotal: 257000, shopifyShare: 0.93, otherMarketing: 46000 },
  { key: "2025-01", orders: 1790, netAov: 1922, cogsPerOrder: 751, cac: 608, shippingPerOrder: 120, packagingPerOrder: 36, txnFeePerOrder: 37, returnRate: 0.055, returnDiscountRate: 0.040, fixedTotal: 260000, shopifyShare: 0.93, otherMarketing: 40000 },
  { key: "2025-02", orders: 1830, netAov: 1918, cogsPerOrder: 750, cac: 610, shippingPerOrder: 121, packagingPerOrder: 36, txnFeePerOrder: 37, returnRate: 0.056, returnDiscountRate: 0.040, fixedTotal: 263000, shopifyShare: 0.93, otherMarketing: 40000 },
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
  // Aug 2026. The month the product opens on. Tuned so the statement foots to
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

function toDrivers(a: Anchor): MonthDrivers {
  return {
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
  };
}

/* ---------------------------------------------------------------------------
 * BRANDS
 *
 * Each workspace runs the same engine over a different set of drivers, so
 * switching brand in the topbar genuinely changes every figure in the product
 * rather than relabelling the same numbers.
 * ------------------------------------------------------------------------- */

export interface BrandProfile {
  id: string;
  name: string;
  initials: string;
  plan: string;
  category: string;
  /** Multipliers applied to the base series to give each brand its own shape. */
  orders: number;
  aov: number;
  cogs: number;
  cac: number;
  fixed: number;
  shipping: number;
  returns: number;
  /** How the acquisition story trends across the window. */
  cacDrift: number;
  headline: string;
}

export const BRAND_PROFILES: BrandProfile[] = [
  {
    id: "bxxyshoes",
    name: "BxxyShoes",
    initials: "BX",
    plan: "Growth",
    category: "Footwear",
    orders: 1, aov: 1, cogs: 1, cac: 1, fixed: 1, shipping: 1, returns: 1,
    cacDrift: 1,
    headline: "Revenue growing, margin eaten by rising acquisition cost.",
  },
  {
    id: "lunelabs",
    name: "Lune Labs",
    initials: "LL",
    plan: "Scale",
    category: "Skincare",
    // Higher margin, cheaper to ship, lighter returns: comfortably profitable.
    orders: 2.35, aov: 0.74, cogs: 0.727, cac: 1.942, fixed: 1.9, shipping: 0.52, returns: 0.34,
    cacDrift: 0.55,
    headline: "High-margin repeat category holding a healthy net margin.",
  },
  {
    id: "northwear",
    name: "Northwear Co.",
    initials: "NW",
    plan: "Growth",
    category: "Apparel",
    // Discount-led apparel: heavy returns and overhead, deeper into the red.
    orders: 0.62, aov: 1.28, cogs: 1.09, cac: 0.761, fixed: 1.12, shipping: 1.18, returns: 1.85,
    cacDrift: 1.35,
    headline: "Discount-led growth with returns and acquisition both running hot.",
  },
];

export const DEFAULT_BRAND_ID = BRAND_PROFILES[0].id;

export function brandProfile(id: string): BrandProfile {
  return BRAND_PROFILES.find((b) => b.id === id) ?? BRAND_PROFILES[0];
}

/** Applies a brand's profile to the base driver series. */
export function driversForBrand(brandId: string): MonthDrivers[] {
  const b = brandProfile(brandId);
  const n = ANCHORS.length;

  return ANCHORS.map((a, i) => {
    const base = toDrivers(a);

    // Drift ramps across the window so each brand has its own trajectory,
    // not just a flat rescaling of the same curve.
    const t = n > 1 ? i / (n - 1) : 0;
    const drift = 1 + (b.cacDrift - 1) * t;

    const fixedTotal = a.fixedTotal * b.fixed;
    return {
      ...base,
      orders: Math.round(a.orders * b.orders),
      netAov: a.netAov * b.aov,
      cogsPerOrder: a.cogsPerOrder * b.aov * b.cogs,
      shippingPerOrder: a.shippingPerOrder * b.shipping,
      packagingPerOrder: a.packagingPerOrder * b.shipping,
      txnFeePerOrder: a.txnFeePerOrder * b.aov,
      cac: a.cac * b.aov * b.cac * drift,
      returnRate: Math.min(0.35, a.returnRate * b.returns),
      returnDiscountRate: Math.min(0.3, a.returnDiscountRate * b.returns),
      fixed: splitFixed(Math.round(fixedTotal)),
      otherMarketing: Math.round(a.otherMarketing * b.orders * b.aov),
    };
  });
}

export const MONTH_DRIVERS: MonthDrivers[] = ANCHORS.map(toDrivers);

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
 * Cost taxonomy. The fixed slot order behind every categorical chart.
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

/* ---------------------------------------------------------------------------
 * QUARTER AGGREGATION
 *
 * Money and volume are summed; every rate is recomputed from those sums rather
 * than averaged, so a quarter's margin is the quarter's actual margin and not
 * the mean of three monthly margins.
 * ------------------------------------------------------------------------- */

export interface QuarterFigures {
  key: string;
  label: string;
  shortLabel: string;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  months: MonthFigures[];
  /** True when the quarter has fewer than three months of data in range. */
  partial: boolean;

  orders: number;
  totalRevenue: number;
  cogs: number;
  grossProfit: number;
  shipping: number;
  packaging: number;
  transactionFees: number;
  fixedCost: number;
  totalOperationalCosts: number;
  profitAfterOperationalCosts: number;
  totalMarketing: number;
  adSpend: number;
  netProfit: number;

  grossMarginPct: number;
  netMarginPct: number;
  aov: number;
  cac: number;
  contributionPerOrder: number;
  roas: number;
  breakEvenRoas: number;
  breakEvenCac: number;
  fixedPerOrder: number;
  cogsPerOrder: number;
  shippingPerOrder: number;
  returnRate: number;
}

export function aggregateQuarters(months: MonthFigures[]): QuarterFigures[] {
  const buckets = new Map<string, MonthFigures[]>();
  for (const m of months) {
    const key = `${m.year}-Q${m.quarter}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(m);
  }

  return [...buckets.entries()].map(([key, ms]) => {
    const sum = (fn: (m: MonthFigures) => number) => ms.reduce((s, m) => s + fn(m), 0);

    const orders = sum((m) => m.orders);
    const totalRevenue = sum((m) => m.totalRevenue);
    const cogs = sum((m) => m.cogs);
    const shipping = sum((m) => m.shipping);
    const packaging = sum((m) => m.packaging);
    const transactionFees = sum((m) => m.transactionFees);
    const fixedCost = sum((m) => m.fixedCost);
    const totalOperationalCosts = sum((m) => m.totalOperationalCosts);
    const totalMarketing = sum((m) => m.totalMarketing);
    const adSpend = sum((m) => m.adSpend);
    const netProfit = sum((m) => m.netProfit);
    const grossProfit = totalRevenue - cogs;

    const first = ms[0];
    return {
      key,
      label: `Q${first.quarter} ${first.year}`,
      shortLabel: `Q${first.quarter} '${String(first.year).slice(2)}`,
      year: first.year,
      quarter: first.quarter,
      months: ms,
      partial: ms.length < 3,

      orders,
      totalRevenue,
      cogs,
      grossProfit,
      shipping,
      packaging,
      transactionFees,
      fixedCost,
      totalOperationalCosts,
      profitAfterOperationalCosts: grossProfit - totalOperationalCosts,
      totalMarketing,
      adSpend,
      netProfit,

      grossMarginPct: (grossProfit / totalRevenue) * 100,
      netMarginPct: (netProfit / totalRevenue) * 100,
      aov: totalRevenue / orders,
      cac: adSpend / orders,
      contributionPerOrder: (netProfit + fixedCost + totalMarketing - adSpend) / orders,
      roas: totalRevenue / adSpend,
      breakEvenRoas: adSpend + netProfit > 0 ? totalRevenue / (adSpend + netProfit) : Infinity,
      breakEvenCac: (adSpend + netProfit) / orders,
      fixedPerOrder: fixedCost / orders,
      cogsPerOrder: cogs / orders,
      shippingPerOrder: shipping / orders,
      // Volume-weighted so a big month is not averaged away by a small one.
      returnRate: ms.reduce((s2, m) => s2 + m.returnRate * m.orders, 0) / orders,
    };
  });
}

/* ---------------------------------------------------------------------------
 * DATE RANGE PRESETS
 * ------------------------------------------------------------------------- */

export type RangePresetId =
  | "last3"
  | "last6"
  | "last12"
  | "thisQuarter"
  | "lastQuarter"
  | "ytd"
  | "custom";

export interface RangePreset {
  id: RangePresetId;
  label: string;
  hint?: string;
}

export const RANGE_PRESETS: RangePreset[] = [
  { id: "last3", label: "Last 3 months" },
  { id: "last6", label: "Last 6 months" },
  { id: "last12", label: "Last 12 months" },
  { id: "thisQuarter", label: "This quarter" },
  { id: "lastQuarter", label: "Last quarter" },
  { id: "ytd", label: "Year to date" },
  { id: "custom", label: "Custom range" },
];

/** Resolves a preset into concrete month keys against the available series. */
export function resolveRange(preset: RangePresetId): { from: MonthKey; to: MonthKey } {
  const keys = MONTHS.map((m) => m.key);
  const last = MONTHS[MONTHS.length - 1];
  const lastKey = last.key;

  const back = (n: number) => keys[Math.max(0, keys.length - n)];

  switch (preset) {
    case "last3":
      return { from: back(3), to: lastKey };
    case "last6":
      return { from: back(6), to: lastKey };
    case "last12":
      return { from: back(12), to: lastKey };
    case "thisQuarter": {
      const inQ = MONTHS.filter((m) => m.year === last.year && m.quarter === last.quarter);
      return { from: inQ[0].key, to: lastKey };
    }
    case "lastQuarter": {
      const prevQ = last.quarter === 1 ? 4 : ((last.quarter - 1) as 1 | 2 | 3 | 4);
      const prevY = last.quarter === 1 ? last.year - 1 : last.year;
      const inQ = MONTHS.filter((m) => m.year === prevY && m.quarter === prevQ);
      return inQ.length
        ? { from: inQ[0].key, to: inQ[inQ.length - 1].key }
        : { from: back(3), to: lastKey };
    }
    case "ytd": {
      const inYear = MONTHS.filter((m) => m.year === last.year);
      return { from: inYear[0].key, to: lastKey };
    }
    default:
      return { from: back(12), to: lastKey };
  }
}

/** How the headline figures are compared against a prior period. */
export type CompareBasis = "mom" | "qoq" | "yoy";

export const COMPARE_OPTIONS: { id: CompareBasis; label: string; short: string; offset: number }[] = [
  { id: "mom", label: "vs previous month", short: "MoM", offset: 1 },
  { id: "qoq", label: "vs previous quarter", short: "QoQ", offset: 3 },
  { id: "yoy", label: "vs same month last year", short: "YoY", offset: 12 },
];
