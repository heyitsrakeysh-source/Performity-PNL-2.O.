/**
 * SKU-level economics for the current month.
 *
 * Contribution per SKU is *derived* the same way the month is — revenue less
 * goods, fulfilment, fees and acquisition — rather than authored. That keeps
 * SKU rows honest against the statement: change a SKU's cost or CAC and its
 * contribution moves the way the model says it should.
 *
 * Two invariants hold, and the long-tail row exists to preserve them exactly:
 *   • SKU orders sum to the month's orders
 *   • SKU contribution sums to the month's contribution before fixed cost
 *
 * ⚠️  PROTOTYPE DATA — replace SEEDS with a per-SKU aggregation over orders,
 *     order_items and ad_spend. Keep `contributionOf()`.
 */

import { CURRENT } from "./model";

export interface SkuSeed {
  id: string;
  name: string;
  category: "Sneakers" | "Sandals" | "Slides" | "Loafers" | "Accessories";
  orders: number;
  aov: number;
  /** Cost of goods as a share of the SKU's own AOV. */
  cogsPct: number;
  returnRate: number;
  /** Blended acquisition cost for this SKU's orders. */
  cac: number;
}

/** Fulfilment costs are per-parcel, so they come from the month, not the SKU. */
const SHIPPING_PER_ORDER = CURRENT.shippingPerOrder;
const PACKAGING_PER_ORDER = CURRENT.packagingPerOrder;
const TXN_FEE_RATE = CURRENT.txnFeePerOrder / CURRENT.aov;

export function contributionOf(s: { aov: number; cogsPct: number; cac: number }) {
  return (
    s.aov -
    s.aov * (s.cogsPct / 100) -
    SHIPPING_PER_ORDER -
    PACKAGING_PER_ORDER -
    s.aov * TXN_FEE_RATE -
    s.cac
  );
}

const SEEDS: SkuSeed[] = [
  // --- contribution-negative: acquisition cost outruns the margin -----------
  { id: "bxs-urb-blk", name: "Urban Runner — Black", category: "Sneakers", orders: 148, aov: 1899, cogsPct: 40.2, returnRate: 9.2, cac: 1210 },
  { id: "bxs-cld-gry", name: "Cloud Grey Slide", category: "Slides", orders: 126, aov: 1699, cogsPct: 38.1, returnRate: 8.8, cac: 1030 },
  { id: "bxs-cls-wht", name: "Classic Sneaker — White", category: "Sneakers", orders: 112, aov: 1879, cogsPct: 39.3, returnRate: 8.0, cac: 1180 },
  { id: "bxs-crt-gum", name: "Court — White Gum", category: "Sneakers", orders: 108, aov: 1799, cogsPct: 38.6, returnRate: 7.6, cac: 1090 },
  { id: "bxs-trk-olv", name: "Trekker Sandal — Olive", category: "Sandals", orders: 101, aov: 1599, cogsPct: 37.8, returnRate: 8.3, cac: 970 },
  { id: "bxs-lfr-tan", name: "Casual Loafer — Tan", category: "Loafers", orders: 88, aov: 1949, cogsPct: 41.0, returnRate: 8.4, cac: 1170 },
  { id: "bxs-sld-nvy", name: "Slide — Navy Blue", category: "Slides", orders: 66, aov: 1499, cogsPct: 36.4, returnRate: 10.1, cac: 920 },
  { id: "bxs-flp-blk", name: "Flip Flop — Black", category: "Slides", orders: 54, aov: 999, cogsPct: 32.7, returnRate: 9.6, cac: 620 },
  // --- the profitable core --------------------------------------------------
  { id: "bxs-rnl-gry", name: "Runner Lite — Grey", category: "Sneakers", orders: 300, aov: 1949, cogsPct: 40.3, returnRate: 7.4, cac: 700 },
  { id: "bxs-spt-blu", name: "Sport Sneaker — Blue", category: "Sneakers", orders: 280, aov: 2099, cogsPct: 39.2, returnRate: 6.8, cac: 690 },
  { id: "bxs-hgt-blk", name: "High Top — Black", category: "Sneakers", orders: 190, aov: 2249, cogsPct: 41.5, returnRate: 6.2, cac: 720 },
  { id: "bxs-sld-cmf", name: "Slide Comfort — White", category: "Slides", orders: 330, aov: 1399, cogsPct: 34.8, returnRate: 7.1, cac: 480 },
  { id: "bxs-brz-tan", name: "Breeze Sandal — Tan", category: "Sandals", orders: 210, aov: 1549, cogsPct: 35.2, returnRate: 5.9, cac: 520 },
  { id: "bxs-drb-brn", name: "Derby — Brown", category: "Loafers", orders: 130, aov: 2599, cogsPct: 42.1, returnRate: 5.4, cac: 800 },
  { id: "bxs-knt-chr", name: "Knit Runner — Charcoal", category: "Sneakers", orders: 244, aov: 2199, cogsPct: 38.9, returnRate: 6.1, cac: 640 },
  { id: "bxs-acc-kit", name: "Care Kit + Laces", category: "Accessories", orders: 60, aov: 549, cogsPct: 28.4, returnRate: 1.2, cac: 90 },
];

export interface Sku extends SkuSeed {
  contributionPerOrder: number;
  isLongTail?: boolean;
}

/* --- residual row, so the roll-up agrees with the statement exactly ------- */

const CONTRIBUTION_TOTAL = CURRENT.orders * CURRENT.contributionPerOrder;

const seededOrders = SEEDS.reduce((s, k) => s + k.orders, 0);
const seededContribution = SEEDS.reduce((s, k) => s + k.orders * contributionOf(k), 0);

const tailOrders = CURRENT.orders - seededOrders;
const tailContribution = CONTRIBUTION_TOTAL - seededContribution;

const LONG_TAIL: Sku = {
  id: "bxs-tail",
  name: "Long tail — 42 other SKUs",
  category: "Accessories",
  orders: tailOrders,
  aov: 1712,
  cogsPct: 37.9,
  returnRate: 7.2,
  cac: 698,
  contributionPerOrder: tailContribution / tailOrders,
  isLongTail: true,
};

export const SKUS: Sku[] = [
  ...SEEDS.map((s) => ({ ...s, contributionPerOrder: contributionOf(s) })),
  LONG_TAIL,
];

export interface SkuRow extends Sku {
  revenue: number;
  totalContribution: number;
  contributionMarginPct: number;
  grossMarginPct: number;
  /** Share of the month's total SKU-level loss this item is responsible for. */
  lossShare: number;
}

const totalLossAbs = SKUS.filter((s) => s.contributionPerOrder < 0).reduce(
  (sum, s) => sum + Math.abs(s.orders * s.contributionPerOrder),
  0,
);

export const SKU_ROWS: SkuRow[] = SKUS.map((s) => {
  const totalContribution = s.orders * s.contributionPerOrder;
  return {
    ...s,
    revenue: s.orders * s.aov,
    totalContribution,
    contributionMarginPct: (s.contributionPerOrder / s.aov) * 100,
    grossMarginPct: 100 - s.cogsPct,
    lossShare: totalContribution < 0 ? (Math.abs(totalContribution) / totalLossAbs) * 100 : 0,
  };
});

export const LOSING_SKUS = SKU_ROWS.filter((s) => s.totalContribution < 0).sort(
  (a, b) => a.totalContribution - b.totalContribution,
);

export const TOTAL_SKU_LOSS = LOSING_SKUS.reduce((s, k) => s + k.totalContribution, 0);

/** The recommended intervention for a loss-making SKU. */
export function skuAction(s: SkuRow): "Raise price" | "Cut ad spend" | "Discontinue" | "Hold" {
  if (s.totalContribution >= 0) return "Hold";
  if (s.returnRate > 9) return "Discontinue";
  if (s.cac > 1000) return "Cut ad spend";
  return "Raise price";
}
