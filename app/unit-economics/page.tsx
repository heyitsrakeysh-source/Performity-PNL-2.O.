"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Download, Search } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { LOSING_SKUS, SKU_ROWS, TOTAL_SKU_LOSS, skuAction, type SkuRow } from "@/lib/data/skus";
import { CATEGORIES } from "@/lib/data/workspace";
import { accounting, money, num, pct } from "@/lib/format";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Delta } from "@/components/ui/Delta";
import { Sparkline } from "@/components/charts/Sparkline";
import { PerOrderBar } from "@/components/charts/Misc";
import { SkuScatter } from "@/components/charts/ScatterBubble";
import { MiniBar } from "@/components/charts/MiniBar";
import { ChartCard } from "@/components/charts/primitives";
import { useToast } from "@/components/shell/Toast";
import { cn } from "@/lib/cn";

type SortKey = "orders" | "aov" | "cogsPct" | "returnRate" | "cac" | "contributionPerOrder" | "totalContribution";

export default function UnitEconomicsPage() {
  const { current, previous, months } = useWorkspace();
  const { push } = useToast();
  const [category, setCategory] = useState("All categories");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "totalContribution", dir: "asc" });

  const trail = months.slice(-12);

  const tiles = [
    { label: "AOV", value: current.aov, prev: previous.aov, fmt: money, better: true, get: (m: typeof current) => m.aov },
    { label: "COGS / order", value: current.cogsPerOrder, prev: previous.cogsPerOrder, fmt: money, better: false, get: (m: typeof current) => m.cogsPerOrder },
    { label: "CAC", value: current.cac, prev: previous.cac, fmt: money, better: false, get: (m: typeof current) => m.cac },
    { label: "Return rate", value: current.returnRate, prev: previous.returnRate, fmt: (v: number) => pct(v), better: false, mode: "pp" as const, get: (m: typeof current) => m.returnRate },
    { label: "Contribution / order", value: current.contributionPerOrder, prev: previous.contributionPerOrder, fmt: money, better: true, get: (m: typeof current) => m.contributionPerOrder },
    { label: "Contribution margin", value: current.contributionMarginPct, prev: previous.contributionMarginPct, fmt: (v: number) => pct(v), better: true, mode: "pp" as const, get: (m: typeof current) => m.contributionMarginPct },
  ];

  const rows = useMemo(() => {
    let out = SKU_ROWS.filter((s) => !s.isLongTail);
    if (category !== "All categories") out = out.filter((s) => s.category === category);
    if (query.trim()) out = out.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()));
    return [...out].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      return sort.dir === "asc" ? av - bv : bv - av;
    });
  }, [category, query, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));

  return (
    <PageShell>
      <PageHeader
        eyebrow={
          <>
            <Chip tone="brand">{current.label}</Chip>
            <Chip tone="critical">{LOSING_SKUS.length} SKUs below break-even</Chip>
          </>
        }
        title="Unit economics"
        subtitle={`What one order actually earns, and which products are paying for themselves. ${LOSING_SKUS.length} of ${SKU_ROWS.length - 1} SKUs are contribution-negative, together costing ${money(Math.abs(TOTAL_SKU_LOSS))} this month.`}
        actions={
          <Button
            icon={<Download size={14} />}
            onClick={() => push({ title: "Export queued", body: "SKU economics export is a demo action.", tone: "info" })}
          >
            Export SKUs
          </Button>
        }
      />

      {/* ------------------------------------------------------- per-order --- */}
      <Card className="mt-6">
        <CardHeader
          title={`One ${money(current.aov)} order, end to end`}
          subtitle="Every cost an average order carries, and what is left over"
          info="Contribution is what remains before fixed overhead. Fixed cost then takes a further ₹ per order."
        />
        <div className="mt-5">
          <PerOrderBar month={current} height={40} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-4">
          {[
            { k: "Contribution before overhead", v: money(current.contributionPerOrder), tone: current.contributionPerOrder >= 0 ? "good" : "bad" },
            { k: "Fixed cost per order", v: money(current.fixedPerOrder), tone: "ink" },
            { k: "Net per order", v: money(current.netProfit / current.orders), tone: current.netProfit >= 0 ? "good" : "bad" },
            { k: "Break-even CAC", v: money(current.breakEvenCac), tone: "ink" },
          ].map((s) => (
            <div key={s.k}>
              <p className="text-[11px] font-medium text-ink-4">{s.k}</p>
              <p
                className={cn(
                  "figure-lg mt-0.5 text-[19px]",
                  s.tone === "good" ? "text-good-ink" : s.tone === "bad" ? "text-critical-ink" : "text-ink",
                )}
              >
                {s.v}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* ----------------------------------------------------------- tiles --- */}
      <div className="stagger mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t, i) => (
          <div
            key={t.label}
            style={{ ["--i" as string]: i }}
            className="rounded-lg border border-line bg-surface p-3.5 shadow-xs transition-[box-shadow,transform] duration-200 hover:-translate-y-px hover:shadow-md"
          >
            <p className="text-[11.5px] font-medium text-ink-3">{t.label}</p>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-1.5">
              <span className="figure-lg text-[20px] text-ink">{t.fmt(t.value)}</span>
              <Delta current={t.value} previous={t.prev} higherIsBetter={t.better} mode={t.mode ?? "pct"} size="sm" />
            </div>
            <Sparkline values={trail.map(t.get)} height={30} color={t.better ? "var(--series-3)" : "var(--series-5)"} />
          </div>
        ))}
      </div>

      {/* --------------------------------------------------- scatter + kill --- */}
      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1.35fr_1fr]">
        <ChartCard
          title="SKU profitability"
          subtitle="Contribution per order against volume, sized by revenue. Anything below the line loses money on every sale."
          info="Colour here is polarity, not identity — two poles with a neutral midpoint, which is why the categorical slot rules don't apply."
          table={{
            columns: ["SKU", "Orders", "Contribution / order", "Total contribution"],
            rows: SKU_ROWS.filter((s) => !s.isLongTail).map((s) => [
              s.name,
              num(s.orders),
              money(s.contributionPerOrder),
              money(s.totalContribution),
            ]),
          }}
        >
          <SkuScatter skus={SKU_ROWS} height={330} />
        </ChartCard>

        <Card className="flex flex-col">
          <CardHeader
            title="Kill list"
            subtitle={`${LOSING_SKUS.length} SKUs lost ${money(Math.abs(TOTAL_SKU_LOSS))} this month`}
            action={<Chip tone="critical">Action needed</Chip>}
          />
          <ul className="mt-3 divide-y divide-line-soft">
            {LOSING_SKUS.map((s, i) => {
              const action = skuAction(s);
              return (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <span className="tnum w-4 shrink-0 text-[11px] font-semibold text-ink-4">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-ink">{s.name}</span>
                    <span className="mt-1 flex items-center gap-2">
                      <MiniBar value={s.lossShare} max={100} tone="critical" width={64} />
                      <span className="tnum text-[10.5px] text-ink-4">{pct(s.lossShare)} of the loss</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="tnum block text-[12.5px] font-bold text-critical-ink">{money(s.contributionPerOrder)}</span>
                    <span className="tnum block text-[10.5px] text-ink-4">{money(s.totalContribution)} total</span>
                  </span>
                  <button
                    onClick={() => push({ title: `${action}: ${s.name}`, body: "Actions are demo-only in the prototype — wire them to your catalogue and ad platforms.", tone: "info" })}
                    className={cn(
                      "shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                      action === "Discontinue"
                        ? "border-critical/40 bg-critical-soft text-critical-ink hover:border-critical"
                        : "border-line bg-surface text-brand-ink hover:border-brand",
                    )}
                  >
                    {action}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      {/* ------------------------------------------------------ SKU table --- */}
      <Card className="mt-3">
        <CardHeader
          title="SKU economics"
          subtitle={`${rows.length} SKUs · sorted by ${sort.key === "totalContribution" ? "profit impact" : sort.key}`}
          action={
            <div className="flex items-center gap-2">
              <span className="relative">
                <Search size={13} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-4" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a SKU…"
                  className="h-8 w-[170px] rounded-md border border-line bg-surface pr-2.5 pl-7 text-[12.5px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none"
                />
              </span>
              <Select
                ariaLabel="Category"
                value={category}
                onChange={setCategory}
                size="sm"
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                className="w-[150px]"
              />
            </div>
          }
        />

        <div className="mt-4 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[900px] border-collapse text-[12.5px]">
            <caption className="sr-only">Per-SKU economics for {current.label}</caption>
            <thead className="bg-surface-2">
              <tr>
                <th scope="col" className="sticky left-0 z-10 border-b border-line bg-surface-2 px-3 py-2.5 text-left text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
                  SKU
                </th>
                {(
                  [
                    ["orders", "Orders"],
                    ["aov", "AOV"],
                    ["cogsPct", "COGS %"],
                    ["returnRate", "Return rate"],
                    ["cac", "CAC"],
                    ["contributionPerOrder", "Contribution / order"],
                    ["totalContribution", "Total contribution"],
                  ] as [SortKey, string][]
                ).map(([key, label]) => (
                  <th key={key} scope="col" className="border-b border-line px-3 py-2.5 text-right">
                    <button
                      onClick={() => toggleSort(key)}
                      className={cn(
                        "inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide uppercase transition-colors",
                        sort.key === key ? "text-brand-ink" : "text-ink-3 hover:text-ink",
                      )}
                    >
                      {label}
                      <ArrowUpDown size={11} className={cn(sort.key === key ? "opacity-100" : "opacity-35")} />
                    </button>
                  </th>
                ))}
                <th scope="col" className="border-b border-line px-3 py-2.5 text-right text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <SkuRowView key={s.id} sku={s} onAct={(a) => push({ title: `${a}: ${s.name}`, tone: "info" })} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  );
}

function SkuRowView({ sku, onAct }: { sku: SkuRow; onAct: (action: string) => void }) {
  const negative = sku.totalContribution < 0;
  const action = skuAction(sku);
  return (
    <tr className={cn("group transition-colors hover:bg-surface-2", negative && "bg-critical-soft/25")}>
      <th
        scope="row"
        className={cn(
          "sticky left-0 z-10 border-b border-line-soft px-3 py-2 text-left font-medium text-ink transition-colors",
          negative ? "bg-[color-mix(in_oklab,var(--critical-soft)_25%,var(--surface))]" : "bg-surface",
          "group-hover:bg-surface-2",
        )}
      >
        <span className="flex items-center gap-2">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: negative ? "var(--critical)" : "var(--good)" }}
            aria-hidden
          />
          <span className="truncate">{sku.name}</span>
          <span className="rounded bg-surface-3 px-1.5 py-px text-[9.5px] font-semibold tracking-wide text-ink-4 uppercase">
            {sku.category}
          </span>
        </span>
      </th>
      <td className="tnum border-b border-line-soft px-3 py-2 text-right text-ink-2">{num(sku.orders)}</td>
      <td className="tnum border-b border-line-soft px-3 py-2 text-right text-ink-2">{money(sku.aov)}</td>
      <td className="tnum border-b border-line-soft px-3 py-2 text-right text-ink-2">{pct(sku.cogsPct)}</td>
      <td className="tnum border-b border-line-soft px-3 py-2 text-right text-ink-2">{pct(sku.returnRate)}</td>
      <td className="tnum border-b border-line-soft px-3 py-2 text-right text-ink-2">{money(sku.cac)}</td>
      <td
        className={cn(
          "tnum border-b border-line-soft px-3 py-2 text-right font-semibold",
          negative ? "text-critical-ink" : "text-good-ink",
        )}
      >
        {accounting(sku.contributionPerOrder)}
      </td>
      <td
        className={cn(
          "tnum border-b border-line-soft px-3 py-2 text-right font-bold",
          negative ? "text-critical-ink" : "text-good-ink",
        )}
      >
        {accounting(sku.totalContribution)}
      </td>
      <td className="border-b border-line-soft px-3 py-2 text-right">
        <button
          onClick={() => onAct(action)}
          className={cn(
            "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
            action === "Hold"
              ? "border-line text-ink-3 hover:text-ink"
              : action === "Discontinue"
                ? "border-critical/40 bg-critical-soft text-critical-ink hover:border-critical"
                : "border-line bg-surface text-brand-ink hover:border-brand",
          )}
        >
          {action}
        </button>
      </td>
    </tr>
  );
}
