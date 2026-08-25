"use client";

import { useState } from "react";
import { Bookmark, Calendar, Filter, RotateCcw, Sparkles } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { CATEGORIES, CHANNELS, REGIONS, SAVED_VIEWS } from "@/lib/data/workspace";
import { SKU_ROWS } from "@/lib/data/skus";
import { money, num, pct } from "@/lib/format";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Chip, ProgressBar } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Segmented } from "@/components/ui/Segmented";
import { Delta } from "@/components/ui/Delta";
import { ChartCard } from "@/components/charts/primitives";
import { SankeyFlow, SankeyLegend } from "@/components/charts/Sankey";
import { MarginHeatmap } from "@/components/charts/Heatmap";
import { WhatIfSimulator } from "@/components/pnl/WhatIfSimulator";
import { useToast } from "@/components/shell/Toast";
import { cn } from "@/lib/cn";

export default function ExplorerPage() {
  const { current, previous, completeness, channel, setChannel } = useWorkspace();
  const { push } = useToast();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [region, setRegion] = useState(REGIONS[0]);
  const [view, setView] = useState<string | null>(null);
  const [flowUnit, setFlowUnit] = useState<"rupees" | "percent">("rupees");

  const filtersActive =
    channel !== "all" || category !== CATEGORIES[0] || region !== REGIONS[0] || view !== null;

  const clearAll = () => {
    setChannel("all");
    setCategory(CATEGORIES[0]);
    setRegion(REGIONS[0]);
    setView(null);
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow={<Chip tone="brand">{current.label}</Chip>}
        title="Explorer"
        subtitle="Follow the money from gross revenue to what is left, find where margin leaks by SKU, and model a fix against the live calculation before committing to it."
        actions={
          <Button href="/statement" icon={<Sparkles size={14} />}>
            Back to statement
          </Button>
        }
      />

      {/* metric strip */}
      <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg border border-line bg-surface p-4 shadow-xs md:grid-cols-3 xl:grid-cols-5">
        {[
          { k: "Revenue", v: money(current.totalRevenue), cur: current.totalRevenue, prev: previous.totalRevenue, better: true },
          { k: "Gross margin", v: pct(current.grossMarginPct), cur: current.grossMarginPct, prev: previous.grossMarginPct, better: true, pp: true },
          { k: "CAC", v: money(current.cac), cur: current.cac, prev: previous.cac, better: false },
          { k: "Contribution margin", v: `${money(current.contributionPerOrder)} /order`, cur: current.contributionPerOrder, prev: previous.contributionPerOrder, better: true },
          { k: "Net profit", v: money(current.netProfit), cur: current.netProfit, prev: previous.netProfit, better: true },
        ].map((s) => (
          <div key={s.k} className="min-w-0">
            <p className="text-[11.5px] font-medium text-ink-3">{s.k}</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className={cn("figure-lg text-[19px]", s.k === "Net profit" && s.cur < 0 ? "text-critical-ink" : "text-ink")}>
                {s.v}
              </span>
              <Delta current={s.cur} previous={s.prev} higherIsBetter={s.better} mode={s.pp ? "pp" : "pct"} size="sm" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[232px_minmax(0,1fr)_312px]">
        {/* ------------------------------------------------------- filters --- */}
        <aside className="space-y-3">
          <Card padded={false}>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                <Filter size={14} className="text-ink-3" />
                Filters
              </span>
              <button
                onClick={clearAll}
                disabled={!filtersActive}
                className="text-[11.5px] font-medium text-brand-ink transition-opacity hover:underline disabled:opacity-35"
              >
                Clear all
              </button>
            </div>

            <div className="space-y-3.5 p-4">
              <div>
                <p className="label-xs mb-1.5">Date range</p>
                <button className="flex h-9 w-full items-center gap-2 rounded-md border border-line bg-surface px-2.5 text-[12.5px] font-medium text-ink transition-colors hover:border-line-strong">
                  <Calendar size={14} className="text-ink-4" />
                  {current.label}
                </button>
              </div>

              <div>
                <p className="label-xs mb-1.5">Channel</p>
                <Segmented
                  size="sm"
                  className="w-full"
                  ariaLabel="Channel"
                  value={channel}
                  onChange={setChannel}
                  options={CHANNELS.map((c) => ({ value: c.id, label: c.id === "all" ? "All" : c.label.split(" ")[0] }))}
                />
              </div>

              <div>
                <p className="label-xs mb-1.5">Product category</p>
                <Select ariaLabel="Product category" size="sm" value={category} onChange={setCategory} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
              </div>

              <div>
                <p className="label-xs mb-1.5">Region</p>
                <Select ariaLabel="Region" size="sm" value={region} onChange={setRegion} options={REGIONS.map((r) => ({ value: r, label: r }))} />
              </div>
            </div>

            <div className="border-t border-line p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="label-xs">Saved views</p>
                <button
                  onClick={() => push({ title: "Manage views", body: "Saved views persist per user in production.", tone: "info" })}
                  className="text-[11px] font-medium text-brand-ink hover:underline"
                >
                  Manage
                </button>
              </div>
              <ul className="space-y-1">
                {SAVED_VIEWS.map((v) => (
                  <li key={v.id}>
                    <button
                      onClick={() => {
                        setView(view === v.id ? null : v.id);
                        if (v.filters.channel) setChannel(v.filters.channel);
                        if (v.filters.category) setCategory(v.filters.category);
                      }}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                        view === v.id ? "bg-brand-soft text-brand-ink" : "text-ink-2 hover:bg-surface-3",
                      )}
                    >
                      <Bookmark size={13} className={cn("mt-0.5 shrink-0", view === v.id ? "text-brand" : "text-ink-4")} />
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-medium">{v.name}</span>
                        <span className="block text-[10.5px] text-ink-4">{v.description}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card>
            <p className="text-[12.5px] font-semibold text-ink">Data completeness</p>
            <p className="tnum mt-1 text-[20px] font-bold text-brand-ink">{completeness.pct.toFixed(0)}%</p>
            <ProgressBar value={completeness.pct} className="mt-2" tone={completeness.pct >= 90 ? "good" : "brand"} />
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
              {completeness.missing} inputs are still missing, so some cost lines are understated.
            </p>
            <Button size="sm" href="/statement" className="mt-3 w-full">
              Review missing data
            </Button>
          </Card>
        </aside>

        {/* --------------------------------------------------------- flow --- */}
        <div className="min-w-0 space-y-3">
          <ChartCard
            title="Profit flow"
            subtitle="Gross revenue narrows to net, then splits into the costs that consume it"
            info="Ribbon width is proportional to rupees. Where costs exceed revenue, the shortfall is stated rather than drawn — a ribbon cannot represent money that was never there."
            legend={<SankeyLegend month={current} />}
            action={
              <Segmented
                size="sm"
                ariaLabel="Flow units"
                value={flowUnit}
                onChange={setFlowUnit}
                options={[
                  { value: "rupees", label: "₹" },
                  { value: "percent", label: "%" },
                ]}
              />
            }
            table={{
              columns: ["Stage", "Amount", "% of net revenue"],
              rows: [
                ["Gross revenue", money(current.grossRevenue), pct((current.grossRevenue / current.totalRevenue) * 100)],
                ["Returns & discounts", money(-current.returnsAndDiscounts), pct(-(current.returnsAndDiscounts / current.totalRevenue) * 100)],
                ["Net revenue", money(current.totalRevenue), "100.0%"],
                ["COGS", money(-current.cogs), pct(-(current.cogs / current.totalRevenue) * 100)],
                ["Operations", money(-current.totalOperationalCosts), pct(-(current.totalOperationalCosts / current.totalRevenue) * 100)],
                ["Marketing", money(-current.totalMarketing), pct(-(current.totalMarketing / current.totalRevenue) * 100)],
                ["Net profit", money(current.netProfit), pct(current.netMarginPct, 2)],
              ],
            }}
          >
            <SankeyFlow month={current} height={392} />
          </ChartCard>

          <Card>
            <CardHeader
              title="Margin leak by SKU"
              subtitle="Each column scaled independently, so a weak cell is weak relative to your own range"
              info="A diverging ramp with a neutral midpoint — and every cell carries its number, so colour is never the only encoding."
              action={<Chip tone="neutral">{num(SKU_ROWS.length - 1)} SKUs</Chip>}
            />
            <div className="mt-4">
              <MarginHeatmap skus={SKU_ROWS} />
            </div>
          </Card>
        </div>

        {/* ---------------------------------------------------- simulator --- */}
        <aside>
          <Card className="xl:sticky xl:top-[76px]">
            <CardHeader
              title="What-if simulator"
              subtitle="Every slider writes into the live model"
              info="Move a driver and the projection is recomputed by the same function that produces the statement — not an approximation."
              action={
                <button
                  onClick={() => push({ title: "How it works", body: "Each slider scales one driver, then the month is recomputed end to end by computeMonth().", tone: "info" })}
                  className="text-[11.5px] font-medium text-brand-ink hover:underline"
                >
                  How it works
                </button>
              }
            />
            <div className="mt-4">
              <WhatIfSimulator month={current} />
            </div>
          </Card>
        </aside>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[11.5px] text-ink-4">
        <RotateCcw size={12} />
        Prototype note: channel, category and region filters are wired to the UI but read the same demo dataset. See
        Guide &amp; setup for where to attach the real query.
      </p>
    </PageShell>
  );
}
