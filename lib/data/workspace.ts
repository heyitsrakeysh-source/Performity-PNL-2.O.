/**
 * Workspace content: the input schema behind the statement editor, plus the
 * alerts, saved views and org metadata the shell renders.
 *
 * ⚠️  PROTOTYPE DATA — see /guide. `EDITOR_SCHEMA` is the piece worth keeping:
 *     its `bind` descriptors are how an edited rupee value is translated back
 *     into a model driver, which is what makes the prototype recalculate.
 */

import type { MonthDrivers } from "./model";

/* ============================================================================
 * INPUT SCHEMA
 * ==========================================================================*/

export type FieldSource = "shopify" | "amazon" | "meta" | "google" | "sheet" | "manual" | "derived";

/** How an edited monthly total maps back onto a driver. */
export type Binding =
  | { kind: "perOrder"; driver: keyof MonthDrivers }
  | { kind: "absolute"; driver: keyof MonthDrivers }
  | { kind: "fixed"; part: "rent" | "salaries" | "software" | "other" }
  | null;

export interface EditorField {
  id: string;
  label: string;
  help?: string;
  /** `null` means the input has never been supplied for this month. */
  seed: number | null;
  unit: "inr" | "pct";
  source: FieldSource;
  bind: Binding;
  /** Sub-rows that itemise the parent without being separately bound. */
  children?: { id: string; label: string; seed: number | null }[];
  recurring?: boolean;
  readOnly?: boolean;
  /** Read-only figures the engine already knows how to compute. */
  derive?: "grossRevenue" | "returnsAndDiscounts" | "salesAmazon" | "netMerchandise";
}

export interface EditorSection {
  id: string;
  title: string;
  help?: string;
  fields: EditorField[];
}

export interface EditorTab {
  id: "revenue" | "cogs" | "operational" | "marketing" | "tax";
  label: string;
  sections: EditorSection[];
}

export const EDITOR_SCHEMA: EditorTab[] = [
  {
    id: "revenue",
    label: "Revenue",
    sections: [
      {
        id: "shopify",
        title: "Shopify",
        help: "Pulled from the Shopify Admin API on every sync.",
        fields: [
          { id: "gross_sales", label: "Gross sales", seed: 0, unit: "inr", source: "shopify", bind: null, readOnly: true, derive: "grossRevenue", help: "Order value before discounts and returns." },
          { id: "returns_discounts", label: "Discounts & returns", seed: 0, unit: "inr", source: "shopify", bind: null, readOnly: true, derive: "returnsAndDiscounts" },
          { id: "net_sales", label: "Net sales", seed: 0, unit: "inr", source: "shopify", bind: { kind: "perOrder", driver: "netAov" }, help: "Gross sales less discounts, returns and cancellations." },
          { id: "shipping_income", label: "Shipping income", seed: 0, unit: "inr", source: "shopify", bind: { kind: "perOrder", driver: "shippingIncomePerOrder" }, help: "Delivery charges collected from customers." },
          { id: "gift_cards", label: "Gift card redemptions", seed: 41_200, unit: "inr", source: "shopify", bind: null },
          { id: "subscriptions", label: "Subscription revenue", seed: 68_400, unit: "inr", source: "shopify", bind: null },
          { id: "taxes_collected", label: "Taxes collected", seed: null, unit: "inr", source: "manual", bind: null, help: "GST collected on orders. Pass-through — excluded from net profit." },
        ],
      },
      {
        id: "amazon",
        title: "Amazon Seller",
        help: "Settlement reports, imported weekly.",
        fields: [
          { id: "amazon_sales", label: "Total sales", seed: 0, unit: "inr", source: "amazon", bind: null, readOnly: true, derive: "salesAmazon" },
          { id: "amazon_fbafees", label: "FBA fulfilment fees", seed: 96_300, unit: "inr", source: "amazon", bind: null },
          { id: "amazon_storage", label: "Storage fees", seed: 18_700, unit: "inr", source: "amazon", bind: null },
          { id: "amazon_settlement", label: "Settlement adjustments", seed: -7_450, unit: "inr", source: "amazon", bind: null },
          { id: "amazon_fees", label: "Marketplace referral fees", seed: null, unit: "inr", source: "manual", bind: null },
        ],
      },
      {
        id: "other_revenue",
        title: "Other income",
        fields: [
          { id: "misc_income", label: "Miscellaneous income", seed: 25_000, unit: "inr", source: "manual", bind: null },
          { id: "interest_income", label: "Interest income", seed: 11_800, unit: "inr", source: "manual", bind: null },
          { id: "retail_income", label: "Retail & offline", seed: null, unit: "inr", source: "manual", bind: null },
        ],
      },
    ],
  },
  {
    id: "cogs",
    label: "Total COGS",
    sections: [
      {
        id: "product_cost",
        title: "Product cost",
        help: "Landed cost of goods sold in the period.",
        fields: [
          { id: "product_cogs", label: "Product COGS", seed: 0, unit: "inr", source: "sheet", bind: { kind: "perOrder", driver: "cogsPerOrder" }, help: "Unit cost × units shipped, from the cost sheet." },
          { id: "import_clearing", label: "Import clearing", seed: 34_600, unit: "inr", source: "sheet", bind: null },
          { id: "duty_drawback", label: "Duty drawback credit", seed: -12_400, unit: "inr", source: "sheet", bind: null },
          { id: "write_off", label: "Inventory write-off", seed: 28_900, unit: "inr", source: "sheet", bind: null },
          { id: "inbound_freight", label: "Inbound freight", seed: null, unit: "inr", source: "manual", bind: null },
          { id: "customs_duty", label: "Customs & duties", seed: null, unit: "inr", source: "manual", bind: null },
        ],
      },
      {
        id: "manufacturing",
        title: "Manufacturing & quality",
        fields: [
          { id: "sampling", label: "Sampling & development", seed: 46_500, unit: "inr", source: "manual", bind: null },
          { id: "inspection", label: "Quality inspection", seed: 22_100, unit: "inr", source: "manual", bind: null },
          { id: "rework", label: "Rework & repair", seed: 15_800, unit: "inr", source: "manual", bind: null },
        ],
      },
    ],
  },
  {
    id: "operational",
    label: "Operational costs",
    sections: [
      {
        id: "fulfilment",
        title: "Shipping & packaging",
        help: "Courier and packaging billed by fulfilment partners.",
        fields: [
          {
            id: "shipping_charges", label: "Shipping charges", seed: 0, unit: "inr", source: "sheet",
            bind: { kind: "perOrder", driver: "shippingPerOrder" },
            children: [
              { id: "bluedart", label: "Blue Dart", seed: 214_200 },
              { id: "shadowfax", label: "Shadowfax", seed: 161_604 },
            ],
          },
          { id: "packaging_charges", label: "Packaging charges", seed: 0, unit: "inr", source: "sheet", bind: { kind: "perOrder", driver: "packagingPerOrder" } },
          { id: "reverse_logistics", label: "Reverse logistics", seed: 118_400, unit: "inr", source: "sheet", bind: null, help: "Cost of collecting and restocking returns." },
          { id: "cod_handling", label: "COD handling", seed: 62_900, unit: "inr", source: "sheet", bind: null },
          { id: "shipment_insurance", label: "Shipment insurance", seed: 19_300, unit: "inr", source: "sheet", bind: null },
          { id: "consumables", label: "Warehouse consumables", seed: 24_700, unit: "inr", source: "manual", bind: null },
          { id: "warehouse_handling", label: "Warehouse handling", seed: null, unit: "inr", source: "manual", bind: null },
        ],
      },
      {
        id: "fixed",
        title: "Fixed cost",
        help: "Standing monthly overhead. Anything marked recurring rolls forward automatically.",
        fields: [
          { id: "rent", label: "Warehouse rent", seed: 0, unit: "inr", source: "manual", bind: { kind: "fixed", part: "rent" }, recurring: true },
          { id: "salaries", label: "Salaries", seed: 0, unit: "inr", source: "manual", bind: { kind: "fixed", part: "salaries" }, recurring: true },
          { id: "software", label: "Software & tools", seed: 0, unit: "inr", source: "manual", bind: { kind: "fixed", part: "software" }, recurring: true },
          { id: "other_fixed", label: "Other overheads", seed: 0, unit: "inr", source: "manual", bind: { kind: "fixed", part: "other" } },
          { id: "utilities", label: "Utilities", seed: 38_400, unit: "inr", source: "manual", bind: null, recurring: true },
          { id: "professional_fees", label: "Professional fees", seed: 55_000, unit: "inr", source: "manual", bind: null, recurring: true },
          { id: "insurance_premium", label: "Insurance premium", seed: 21_500, unit: "inr", source: "manual", bind: null, recurring: true },
        ],
      },
      {
        id: "transaction",
        title: "Transaction charges",
        fields: [
          { id: "gateway_fees", label: "Payment gateway fees", seed: 0, unit: "inr", source: "shopify", bind: { kind: "perOrder", driver: "txnFeePerOrder" } },
          { id: "chargebacks", label: "Chargebacks & disputes", seed: 9_800, unit: "inr", source: "shopify", bind: null },
          { id: "fx_conversion", label: "FX conversion", seed: 6_200, unit: "inr", source: "shopify", bind: null },
          { id: "cod_fees", label: "COD remittance fees", seed: null, unit: "inr", source: "manual", bind: null },
          { id: "platform_fees", label: "Platform fees", seed: null, unit: "inr", source: "manual", bind: null },
        ],
      },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    sections: [
      {
        id: "paid_media",
        title: "Paid media",
        help: "Synced nightly from each ad platform.",
        fields: [
          {
            id: "total_ad_spend", label: "Total ad spend", seed: 0, unit: "inr", source: "meta",
            bind: { kind: "perOrder", driver: "cac" },
            help: "Editing the total re-derives blended CAC across the month's orders.",
            children: [
              { id: "meta_spend", label: "Meta Ads", seed: 1_348_600 },
              { id: "google_spend", label: "Google Ads", seed: 608_900 },
              { id: "amazon_ad", label: "Amazon Ads", seed: 217_608 },
            ],
          },
          { id: "marketplace_promos", label: "Marketplace promotions", seed: 74_300, unit: "inr", source: "amazon", bind: null },
          { id: "affiliate", label: "Affiliate commissions", seed: 52_800, unit: "inr", source: "manual", bind: null },
          { id: "coupon_subsidy", label: "Coupon subsidy", seed: 63_100, unit: "inr", source: "shopify", bind: null },
          { id: "amazon_ads", label: "Amazon Ads (unreconciled)", seed: null, unit: "inr", source: "manual", bind: null },
        ],
      },
      {
        id: "non_media",
        title: "Non-media marketing",
        fields: [
          { id: "agency_retainer", label: "Agency retainer", seed: 0, unit: "inr", source: "manual", bind: { kind: "absolute", driver: "otherMarketing" }, recurring: true },
          { id: "crm_tooling", label: "Email & SMS tooling", seed: 32_400, unit: "inr", source: "manual", bind: null, recurring: true },
          { id: "events", label: "Events & sampling", seed: 41_700, unit: "inr", source: "manual", bind: null },
          { id: "influencer", label: "Influencer & affiliate", seed: null, unit: "inr", source: "manual", bind: null },
          { id: "creative_production", label: "Creative production", seed: null, unit: "inr", source: "manual", bind: null },
        ],
      },
    ],
  },
  {
    id: "tax",
    label: "Tax",
    sections: [
      {
        id: "statutory",
        title: "Statutory",
        fields: [
          { id: "gst_payable", label: "GST payable", seed: 0, unit: "inr", source: "manual", bind: { kind: "absolute", driver: "tax" } },
          { id: "gst_input_credit", label: "GST input credit", seed: 486_200, unit: "inr", source: "manual", bind: null },
          { id: "professional_tax", label: "Professional tax", seed: 14_400, unit: "inr", source: "manual", bind: null },
          { id: "advance_tax", label: "Advance tax", seed: 0, unit: "inr", source: "manual", bind: null },
          { id: "tds", label: "TDS", seed: null, unit: "inr", source: "manual", bind: null },
        ],
      },
    ],
  },
];

export const ALL_FIELDS = EDITOR_SCHEMA.flatMap((t) =>
  t.sections.flatMap((s) => s.fields.map((f) => ({ ...f, tabId: t.id, sectionId: s.id, sectionTitle: s.title, tabLabel: t.label }))),
);

export type FlatField = (typeof ALL_FIELDS)[number];

export const SOURCE_META: Record<FieldSource, { label: string; short: string }> = {
  shopify: { label: "Synced from Shopify", short: "Shopify" },
  amazon: { label: "Synced from Amazon Seller Central", short: "Amazon" },
  meta: { label: "Synced from Meta Ads", short: "Meta" },
  google: { label: "Synced from Google Ads", short: "Google" },
  sheet: { label: "Imported from the cost sheet", short: "Sheet" },
  manual: { label: "Entered manually", short: "Manual" },
  derived: { label: "Calculated by Performity", short: "Derived" },
};

/* ============================================================================
 * ALERTS
 * ==========================================================================*/

export interface Alert {
  id: string;
  title: string;
  detail: string;
  time: string;
  severity: "critical" | "warning" | "info";
  action: { label: string; href: string };
}

export const ALERTS: Alert[] = [
  {
    id: "a1",
    title: "Blended CAC crossed ₹750",
    detail: "CAC has run above the ₹750 guardrail for 6 consecutive days. At the current contribution margin this pushes the month below break-even.",
    time: "Today · 10:42",
    severity: "critical",
    action: { label: "Review campaigns", href: "/unit-economics" },
  },
  {
    id: "a2",
    title: "Return rate on Slides exceeded 9%",
    detail: "Cloud Grey Slide is returning at 8.8% and Slide — Navy Blue at 10.1%. Sizing complaints account for 61% of return reasons.",
    time: "Today · 09:15",
    severity: "warning",
    action: { label: "Inspect sizing issue", href: "/unit-economics" },
  },
  {
    id: "a3",
    title: "Inputs still missing for Aug 2026",
    detail: "Taxes, warehouse handling and COD remittance fees have not been entered. Accuracy of the net profit line is affected.",
    time: "Yesterday · 18:30",
    severity: "warning",
    action: { label: "Complete inputs", href: "/statement" },
  },
  {
    id: "a4",
    title: "Shopify sync completed",
    detail: "3,041 orders and 2,847 fulfilments reconciled for the period. 3 manual overrides preserved.",
    time: "Yesterday · 04:00",
    severity: "info",
    action: { label: "View sync log", href: "/guide" },
  },
];

/* ============================================================================
 * SAVED VIEWS & FILTERS
 * ==========================================================================*/

export interface SavedView {
  id: string;
  name: string;
  description: string;
  filters: { channel?: string; category?: string; onlyLossMaking?: boolean };
}

export const SAVED_VIEWS: SavedView[] = [
  { id: "v1", name: "Loss-making SKUs", description: "Contribution per order below zero", filters: { onlyLossMaking: true } },
  { id: "v2", name: "Paid traffic only", description: "Orders attributed to Meta and Google", filters: { channel: "shopify" } },
  { id: "v3", name: "Sneakers deep-dive", description: "The category carrying most of the loss", filters: { category: "Sneakers" } },
  { id: "v4", name: "Marketplace performance", description: "Amazon Seller channel", filters: { channel: "amazon" } },
];

export const CHANNELS = [
  { id: "all", label: "All channels" },
  { id: "shopify", label: "Shopify" },
  { id: "amazon", label: "Amazon Seller" },
];

export const CATEGORIES = ["All categories", "Sneakers", "Sandals", "Slides", "Loafers", "Accessories"];
export const REGIONS = ["All regions", "North", "West", "South", "East"];

/* ============================================================================
 * ORG
 * ==========================================================================*/

export const BRANDS = [
  { id: "bxxyshoes", name: "BxxyShoes", plan: "Growth", initials: "BX" },
  { id: "lunelabs", name: "Lune Labs", plan: "Scale", initials: "LL" },
  { id: "northwear", name: "Northwear Co.", plan: "Growth", initials: "NW" },
];

export const CURRENT_USER = {
  name: "Rakesh Suthar",
  role: "Founder",
  initials: "RS",
  email: "rakesh@bxxyshoes.in",
};

export interface Notification {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  kind: "alert" | "comment" | "sync";
}

export const NOTIFICATIONS: Notification[] = [
  { id: "n1", kind: "alert", title: "CAC crossed ₹750", body: "Blended acquisition cost is above the guardrail for the sixth day.", time: "2h ago", unread: true },
  { id: "n2", kind: "comment", title: "Ananya Patel commented", body: "@Rakesh why did packaging jump 62% in July?", time: "2h ago", unread: true },
  { id: "n3", kind: "sync", title: "Shopify sync completed", body: "3,041 orders reconciled · 3 manual overrides preserved.", time: "6h ago", unread: true },
  { id: "n4", kind: "alert", title: "Return rate above target", body: "Slides category returning at 9.4% against a 6% target.", time: "1d ago", unread: false },
  { id: "n5", kind: "comment", title: "Ananya Patel resolved a thread", body: "Fixed cost allocation for the Pune warehouse.", time: "2d ago", unread: false },
];

export interface CellComment {
  id: string;
  rowId: string;
  monthKey: string;
  author: string;
  initials: string;
  body: string;
  time: string;
  resolved: boolean;
  replies?: { author: string; initials: string; body: string; time: string }[];
}

export const CELL_COMMENTS: CellComment[] = [
  {
    id: "c1",
    rowId: "packaging",
    monthKey: "2026-07",
    author: "Ananya Patel",
    initials: "AP",
    body: "Why did packaging jump in July? It looks out of line with order growth.",
    time: "2h ago",
    resolved: false,
    replies: [
      { author: "Rakesh Suthar", initials: "RS", body: "Courier rate revision plus the premium gift-box launch. Both land in the same line.", time: "1h ago" },
    ],
  },
  {
    id: "c2",
    rowId: "adspend",
    monthKey: "2026-08",
    author: "Dev Raman",
    initials: "DR",
    body: "Meta spend for the Independence Day push is booked here — worth splitting campaign-level next month.",
    time: "5h ago",
    resolved: false,
  },
];
