"use client";

/**
 * The P&L statement.
 *
 * The original tool rendered this as a flat grid of numbers. The changes that
 * matter here: a sticky row rail so labels never scroll away, hierarchy you
 * can collapse, magnitude bars so a column can be scanned without reading
 * every figure, month-on-month movement inline, and cells that carry their own
 * provenance (which integration produced the number, and whether an input
 * behind it is still missing).
 */

import { Fragment, useMemo, useState } from "react";
import { AlertTriangle, ChevronRight, MessageSquare, Pencil } from "lucide-react";
import type { MonthFigures } from "@/lib/data/model";
import { useWorkspace } from "@/lib/store";
import { ALL_FIELDS, CELL_COMMENTS, SOURCE_META } from "@/lib/data/workspace";
import { accounting, changePct, money, num, pct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { DeltaText } from "@/components/ui/Delta";
import { MiniBar } from "@/components/charts/MiniBar";

type RowKind = "group" | "line" | "total" | "result" | "memo";

interface Row {
  id: string;
  label: string;
  kind: RowKind;
  get: (m: MonthFigures) => number;
  /** Rendering hint: costs read better as their own sign. */
  isCost?: boolean;
  higherIsBetter?: boolean;
  format?: (v: number) => string;
  fieldIds?: string[];
  info?: string;
  children?: Row[];
}

const STATEMENT: Row[] = [
  {
    id: "revenue",
    label: "Revenue",
    kind: "group",
    get: (m) => m.totalRevenue,
    children: [
      {
        id: "shopify",
        label: "Shopify",
        kind: "line",
        get: (m) => m.netSalesShopify + m.shippingIncomeShopify,
        children: [
          { id: "net_sales", label: "Net sales", kind: "line", get: (m) => m.netSalesShopify, fieldIds: ["net_sales"] },
          { id: "shipping_income", label: "Shipping income", kind: "line", get: (m) => m.shippingIncomeShopify, fieldIds: ["shipping_income"] },
          { id: "taxes", label: "Taxes collected", kind: "line", get: () => 0, fieldIds: ["taxes_collected"], info: "GST collected on orders. Pass-through, excluded from net profit." },
        ],
      },
      {
        id: "amazon",
        label: "Amazon Seller",
        kind: "line",
        get: (m) => m.salesAmazon,
        children: [{ id: "amazon_sales", label: "Total sales", kind: "line", get: (m) => m.salesAmazon, fieldIds: ["amazon_fees"] }],
      },
    ],
  },
  { id: "total_revenue", label: "Total revenue", kind: "total", get: (m) => m.totalRevenue },
  {
    id: "cogs",
    label: "Total COGS",
    kind: "line",
    isCost: true,
    higherIsBetter: false,
    get: (m) => m.cogs,
    fieldIds: ["product_cogs", "inbound_freight", "customs_duty"],
  },
  { id: "gross_profit", label: "Gross profit", kind: "result", get: (m) => m.grossProfit },
  {
    id: "opcosts",
    label: "Operational costs",
    kind: "group",
    isCost: true,
    higherIsBetter: false,
    get: (m) => m.totalOperationalCosts,
    children: [
      { id: "shipping", label: "Net shipping charges", kind: "line", isCost: true, higherIsBetter: false, get: (m) => m.shipping, fieldIds: ["shipping_charges"] },
      { id: "packaging", label: "Packaging charges", kind: "line", isCost: true, higherIsBetter: false, get: (m) => m.packaging, fieldIds: ["packaging_charges", "warehouse_handling"] },
      { id: "transaction", label: "Transaction charges", kind: "line", isCost: true, higherIsBetter: false, get: (m) => m.transactionFees, fieldIds: ["gateway_fees", "cod_fees", "platform_fees"] },
      {
        id: "fixed",
        label: "Fixed cost",
        kind: "line",
        isCost: true,
        higherIsBetter: false,
        get: (m) => m.fixedCost,
        children: [
          { id: "rent", label: "Warehouse rent", kind: "line", isCost: true, higherIsBetter: false, get: (m) => m.fixedBreakdown.rent },
          { id: "salaries", label: "Salaries", kind: "line", isCost: true, higherIsBetter: false, get: (m) => m.fixedBreakdown.salaries },
          { id: "software", label: "Software & tools", kind: "line", isCost: true, higherIsBetter: false, get: (m) => m.fixedBreakdown.software },
          { id: "other_fixed", label: "Other overheads", kind: "line", isCost: true, higherIsBetter: false, get: (m) => m.fixedBreakdown.other },
        ],
      },
    ],
  },
  { id: "total_opcosts", label: "Total operational costs", kind: "total", isCost: true, higherIsBetter: false, get: (m) => m.totalOperationalCosts },
  { id: "profit_after_ops", label: "Profit after operational costs", kind: "result", get: (m) => m.profitAfterOperationalCosts },
  {
    id: "marketing",
    label: "Marketing expenses",
    kind: "group",
    isCost: true,
    higherIsBetter: false,
    get: (m) => m.totalMarketing,
    children: [
      { id: "adspend", label: "Total ad spends", kind: "line", isCost: true, higherIsBetter: false, get: (m) => m.adSpend, fieldIds: ["total_ad_spend"] },
      { id: "othermkt", label: "Other marketing", kind: "line", isCost: true, higherIsBetter: false, get: (m) => m.otherMarketing, fieldIds: ["agency_retainer", "influencer", "creative_production"] },
    ],
  },
  { id: "total_marketing", label: "Total marketing expenses", kind: "total", isCost: true, higherIsBetter: false, get: (m) => m.totalMarketing },
  { id: "profit_after_marketing", label: "Profit after marketing expenses", kind: "result", get: (m) => m.profitAfterMarketing },
  { id: "tax", label: "Tax", kind: "line", isCost: true, higherIsBetter: false, get: (m) => m.tax, fieldIds: ["gst_payable", "tds"] },
  { id: "net_profit", label: "Net profit", kind: "result", get: (m) => m.netProfit },
];

const MEMO: Row[] = [
  { id: "orders", label: "Orders", kind: "memo", get: (m) => m.orders, format: (v) => num(v) },
  { id: "aov", label: "AOV", kind: "memo", get: (m) => m.aov, format: (v) => money(v) },
  { id: "cac", label: "Blended CAC", kind: "memo", higherIsBetter: false, get: (m) => m.cac, format: (v) => money(v) },
  { id: "contribution", label: "Contribution / order", kind: "memo", get: (m) => m.contributionPerOrder, format: (v) => money(v) },
  { id: "roas", label: "Blended ROAS", kind: "memo", get: (m) => m.roas, format: (v) => v.toFixed(2) },
  { id: "net_margin", label: "Net margin", kind: "memo", get: (m) => m.netMarginPct, format: (v) => pct(v, 2) },
];

function flatten(rows: Row[], expanded: Set<string>, depth = 0): { row: Row; depth: number }[] {
  const out: { row: Row; depth: number }[] = [];
  for (const r of rows) {
    out.push({ row: r, depth });
    if (r.children && expanded.has(r.id)) out.push(...flatten(r.children, expanded, depth + 1));
  }
  return out;
}

export function StatementTable({
  months,
  onEditMonth,
  condensed = false,
  showMemo = true,
}: {
  months: MonthFigures[];
  onEditMonth?: (key: string) => void;
  condensed?: boolean;
  showMemo?: boolean;
}) {
  const { fieldValue, isPending } = useWorkspace();
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(condensed ? [] : ["revenue", "opcosts", "marketing"]),
  );
  const [showDelta, setShowDelta] = useState(months.length <= 6);
  const [hoverRow, setHoverRow] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      flatten(
        condensed
          ? STATEMENT.filter(
              (r) => r.kind === "total" || r.kind === "result" || r.id === "cogs" || r.id === "tax",
            )
          : STATEMENT,
        expanded,
      ),
    [expanded, condensed],
  );

  const last = months[months.length - 1];

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const commentsByRow = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of CELL_COMMENTS) map.set(c.rowId, (map.get(c.rowId) ?? 0) + 1);
    return map;
  }, []);

  /** Largest absolute value in a row across the visible months. The scale for its magnitude bars. */
  const rowMax = (row: Row) => Math.max(...months.map((m) => Math.abs(row.get(m))), 1);

  const missingFor = (row: Row, m: MonthFigures) =>
    (row.fieldIds ?? []).filter((id) => {
      const f = ALL_FIELDS.find((x) => x.id === id);
      return f && fieldValue(m.key, f) === null;
    });

  return (
    <div className={cn(isPending && "is-pending")}>
      {!condensed ? (
        <div className="mb-2.5 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowDelta((v) => !v)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-colors",
              showDelta ? "border-brand bg-brand-soft text-brand-ink" : "border-line bg-surface text-ink-3 hover:text-ink",
            )}
          >
            Month-on-month change
          </button>
          <button
            onClick={() =>
              setExpanded((prev) => (prev.size ? new Set() : new Set(["revenue", "shopify", "amazon", "opcosts", "fixed", "marketing"])))
            }
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-[12px] font-medium text-ink-3 transition-colors hover:text-ink"
          >
            {expanded.size ? "Collapse all" : "Expand all"}
          </button>
          <span className="text-[11.5px] text-ink-4">All values in ₹ · click any month cell to edit its inputs</span>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full border-collapse text-[12.5px]">
          <caption className="sr-only">
            Profit and loss statement from {months[0]?.label} to {last?.label}
          </caption>
          <thead>
            <tr className="bg-surface-2">
              <th
                scope="col"
                className="sticky left-0 z-20 min-w-[228px] border-b border-line bg-surface-2 px-3 py-2.5 text-left text-[11px] font-semibold tracking-wide text-ink-3 uppercase"
              >
                Particular
              </th>
              {months.map((m) => (
                <Fragment key={m.key}>
                  <th
                    scope="col"
                    className={cn(
                      "min-w-[112px] border-b border-line px-3 py-2.5 text-right text-[11px] font-semibold tracking-wide uppercase",
                      m.key === last.key ? "bg-brand-soft text-brand-ink" : "text-ink-3",
                    )}
                  >
                    <span className="flex items-center justify-end gap-1.5">
                      {m.label}
                      {onEditMonth ? (
                        <button
                          onClick={() => onEditMonth(m.key)}
                          aria-label={`Edit inputs for ${m.label}`}
                          className="grid size-5 place-items-center rounded text-ink-4 transition-colors hover:bg-surface-3 hover:text-brand"
                        >
                          <Pencil size={11} />
                        </button>
                      ) : null}
                    </span>
                  </th>
                  {showDelta ? (
                    <th scope="col" className="min-w-[70px] border-b border-line px-2 py-2.5 text-right text-[11px] font-semibold tracking-wide text-ink-4 uppercase">
                      Δ
                    </th>
                  ) : null}
                </Fragment>
              ))}
              <th scope="col" className="min-w-[118px] border-b border-line px-3 py-2.5 text-right text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
                Total
              </th>
              <th scope="col" className="min-w-[86px] border-b border-line px-3 py-2.5 text-right text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
                % of rev
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map(({ row, depth }) => {
              const isGroup = Boolean(row.children?.length);
              const open = expanded.has(row.id);
              const total = months.reduce((s, m) => s + row.get(m), 0);
              const revTotal = months.reduce((s, m) => s + m.totalRevenue, 0);
              const max = rowMax(row);
              const emphasised = row.kind === "result" || row.kind === "total";
              const isNet = row.id === "net_profit";
              const comments = commentsByRow.get(row.id) ?? 0;

              return (
                <tr
                  key={row.id}
                  onMouseEnter={() => setHoverRow(row.id)}
                  onMouseLeave={() => setHoverRow(null)}
                  className={cn(
                    "group transition-colors",
                    hoverRow === row.id && "bg-surface-2",
                    row.kind === "total" && "bg-surface-2/60",
                    row.kind === "result" && "bg-brand-soft/35",
                    isNet && "bg-brand-soft/70",
                  )}
                >
                  <th
                    scope="row"
                    className={cn(
                      "sticky left-0 z-10 border-b border-line-soft px-3 py-[7px] text-left font-normal",
                      hoverRow === row.id ? "bg-surface-2" : "bg-surface",
                      row.kind === "total" && "bg-surface-2",
                      row.kind === "result" && "bg-[color-mix(in_oklab,var(--brand-soft)_45%,var(--surface))]",
                      isNet && "bg-[color-mix(in_oklab,var(--brand-soft)_80%,var(--surface))]",
                    )}
                  >
                    <span className="flex items-center gap-1.5" style={{ paddingLeft: depth * 14 }}>
                      {isGroup ? (
                        <button
                          onClick={() => toggle(row.id)}
                          aria-expanded={open}
                          aria-label={`${open ? "Collapse" : "Expand"} ${row.label}`}
                          className="grid size-4 shrink-0 place-items-center rounded text-ink-4 transition-colors hover:text-ink"
                        >
                          <ChevronRight size={12} className={cn("transition-transform duration-200", open && "rotate-90")} />
                        </button>
                      ) : (
                        <span className="w-4 shrink-0" />
                      )}
                      <span
                        className={cn(
                          "truncate",
                          emphasised ? "font-semibold text-ink" : depth === 0 ? "font-medium text-ink" : "text-ink-2",
                          isNet && "font-bold",
                        )}
                      >
                        {row.label}
                      </span>
                      {comments > 0 ? (
                        <span
                          className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-brand-soft px-1.5 py-px text-[9.5px] font-bold text-brand-ink"
                          title={`${comments} comment${comments === 1 ? "" : "s"}`}
                        >
                          <MessageSquare size={9} />
                          {comments}
                        </span>
                      ) : null}
                    </span>
                  </th>

                  {months.map((m, mi) => {
                    const v = row.get(m);
                    const prev = mi > 0 ? row.get(months[mi - 1]) : null;
                    const missing = missingFor(row, m);
                    const isLastCol = m.key === last.key;
                    const fmt = row.format ?? ((x: number) => accounting(x));
                    // An expanded group's subtotal is repeated by the "Total …"
                    // row directly beneath it; showing it twice is just noise.
                    const suppressed = isGroup && open;

                    return (
                      <Fragment key={m.key}>
                        <td
                          className={cn(
                            "tnum border-b border-line-soft px-3 py-[7px] text-right whitespace-nowrap",
                            emphasised ? "font-semibold text-ink" : "text-ink-2",
                            isNet && (v < 0 ? "font-bold text-critical-ink" : "font-bold text-good-ink"),
                            isLastCol && !isNet && "font-medium text-ink",
                          )}
                          title={
                            row.fieldIds?.length
                              ? `${row.label} · ${m.label}${missing.length ? ` · ${missing.length} input(s) missing` : " · complete"}`
                              : `${row.label} · ${m.label}`
                          }
                        >
                          <span className="inline-flex items-center justify-end gap-1.5">
                            {missing.length ? (
                              <AlertTriangle size={11.5} className="shrink-0 text-warning" aria-label={`${missing.length} inputs missing`} />
                            ) : null}
                            {suppressed ? <span className="text-ink-4">-</span> : fmt(v)}
                          </span>
                          {!suppressed && !condensed && row.kind !== "memo" && max > 0 && !emphasised ? (
                            <span className="mt-1 block">
                              <MiniBar value={v} max={max} width={54} tone={row.isCost ? "muted" : "brand"} />
                            </span>
                          ) : null}
                        </td>
                        {showDelta ? (
                          <td className="border-b border-line-soft px-2 py-[7px] text-right text-[11px] whitespace-nowrap">
                            {prev !== null && !suppressed ? (
                              <DeltaText
                                value={changePct(v, prev)}
                                higherIsBetter={row.higherIsBetter ?? !row.isCost}
                              />
                            ) : (
                              <span className="text-ink-4">-</span>
                            )}
                          </td>
                        ) : null}
                      </Fragment>
                    );
                  })}

                  <td
                    className={cn(
                      "tnum border-b border-line-soft px-3 py-[7px] text-right font-semibold whitespace-nowrap",
                      isNet ? (total < 0 ? "text-critical-ink" : "text-good-ink") : "text-ink",
                    )}
                  >
                    {row.kind === "memo" || (isGroup && open) ? "-" : accounting(total)}
                  </td>
                  <td className="tnum border-b border-line-soft px-3 py-[7px] text-right text-ink-3 whitespace-nowrap">
                    {row.kind === "memo" || revTotal === 0 || (isGroup && open) ? "-" : pct((total / revTotal) * 100)}
                  </td>
                </tr>
              );
            })}

            {showMemo ? (
              <>
                <tr>
                  <th
                    scope="row"
                    colSpan={1}
                    className="sticky left-0 z-10 bg-surface px-3 pt-4 pb-1.5 text-left text-[10px] font-semibold tracking-wider text-ink-4 uppercase"
                  >
                    Memo
                  </th>
                  <td colSpan={months.length * (showDelta ? 2 : 1) + 2} className="pt-4 pb-1.5" />
                </tr>
                {MEMO.map((row) => (
                  <tr key={row.id} className="group transition-colors hover:bg-surface-2">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-b border-line-soft bg-surface px-3 py-[7px] pl-[26px] text-left font-normal text-ink-2 group-hover:bg-surface-2"
                    >
                      {row.label}
                    </th>
                    {months.map((m, mi) => {
                      const v = row.get(m);
                      const prev = mi > 0 ? row.get(months[mi - 1]) : null;
                      return (
                        <Fragment key={m.key}>
                          <td className="tnum border-b border-line-soft px-3 py-[7px] text-right text-ink-2 whitespace-nowrap">
                            {(row.format ?? num)(v)}
                          </td>
                          {showDelta ? (
                            <td className="border-b border-line-soft px-2 py-[7px] text-right text-[11px]">
                              {prev !== null ? (
                                <DeltaText value={changePct(v, prev)} higherIsBetter={row.higherIsBetter ?? true} />
                              ) : (
                                <span className="text-ink-4">-</span>
                              )}
                            </td>
                          ) : null}
                        </Fragment>
                      );
                    })}
                    <td className="tnum border-b border-line-soft px-3 py-[7px] text-right text-ink-3">-</td>
                    <td className="tnum border-b border-line-soft px-3 py-[7px] text-right text-ink-3">-</td>
                  </tr>
                ))}
              </>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-4">
        <span className="inline-flex items-center gap-1.5">
          <AlertTriangle size={11} className="text-warning" /> an input behind this figure is missing
        </span>
        <span>Sources: {Object.values(SOURCE_META).map((s) => s.short).join(" · ")}</span>
      </p>
    </div>
  );
}
