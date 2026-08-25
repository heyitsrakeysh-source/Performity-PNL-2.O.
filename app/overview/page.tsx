"use client";

import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { buildInsights, profitBridge } from "@/lib/data/derived";
import { money, moneyCompact, num, pct } from "@/lib/format";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { FilterBar } from "@/components/shell/FilterBar";
import { CompletenessStrip } from "@/components/pnl/CompletenessStrip";
import { KpiCard } from "@/components/pnl/KpiCard";
import { InsightsList } from "@/components/pnl/InsightsList";
import { StatementTable } from "@/components/pnl/StatementTable";
import { ChartCard } from "@/components/charts/primitives";
import { PerformancePanels } from "@/components/charts/PerformancePanels";
import { RupeeRuler } from "@/components/charts/RupeeRuler";
import { Waterfall } from "@/components/charts/Waterfall";
import { MarginGauge, PerOrderBar } from "@/components/charts/Misc";
import { Chip, StatusBadge } from "@/components/ui/Bits";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

export default function OverviewPage() {
  const { current, previous, visibleMonths, months, isPending } = useWorkspace();

  const insights = buildInsights(previous, current);
  const bridge = profitBridge(current);
  const trail = (fn: (m: typeof current) => number) => months.slice(-12).map(fn);

  return (
    <PageShell>
      <PageHeader
        eyebrow={
          <>
            <Chip tone="brand">{current.label}</Chip>
            <StatusBadge status="warning" label="Month in progress · day 24 of 31" />
            <span className="inline-flex items-center gap-1 text-[11.5px] text-ink-4">
              <Clock3 size={12} /> synced 12 minutes ago
            </span>
          </>
        }
        title="Profit overview"
        subtitle={
          <>
            {current.orders.toLocaleString("en-IN")} orders brought in {money(current.totalRevenue)} and kept{" "}
            <strong className={current.netProfit < 0 ? "text-critical-ink" : "text-good-ink"}>
              {money(current.netProfit)}
            </strong>
            . Every figure below is derived from one reconciling model — sub-lines always foot to their totals.
          </>
        }
        actions={
          <Link
            href="/story"
            className="group inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2 text-[13px] font-medium text-ink transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-sm"
          >
            Why did profit move?
            <ArrowRight size={14} className="text-brand transition-transform group-hover:translate-x-0.5" />
          </Link>
        }
      />

      {/* ---------------------------------------------------------- KPIs --- */}
      <div className="stagger mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
        <KpiCard
          index={0}
          label="Total revenue"
          value={current.totalRevenue}
          previous={previous.totalRevenue}
          format={(v) => moneyCompact(v)}
          series={trail((m) => m.totalRevenue)}
          color="var(--brand)"
          info="Net sales plus shipping income, after returns and discounts."
          footnote={`${num(current.orders)} orders at ${money(current.aov)} AOV`}
        />
        <KpiCard
          index={1}
          label="Gross profit"
          value={current.grossProfit}
          previous={previous.grossProfit}
          format={(v) => moneyCompact(v)}
          series={trail((m) => m.grossProfit)}
          color="var(--series-3)"
          info="Revenue less cost of goods sold."
          footnote={`${pct(current.grossMarginPct)} gross margin`}
        />
        <KpiCard
          index={2}
          label="Marketing spend"
          value={current.totalMarketing}
          previous={previous.totalMarketing}
          higherIsBetter={false}
          format={(v) => moneyCompact(v)}
          series={trail((m) => m.totalMarketing)}
          color="var(--series-5)"
          info="Paid media plus retainers and production."
          footnote={`ROAS ${current.roas.toFixed(2)} against break-even ${current.breakEvenRoas.toFixed(2)}`}
        />
        <KpiCard
          index={3}
          label="Net profit"
          value={current.netProfit}
          previous={previous.netProfit}
          format={(v) => money(v)}
          series={trail((m) => m.netProfit)}
          color={current.netProfit >= 0 ? "var(--good)" : "var(--critical)"}
          emphasis
          info="What is left after every cost, including fixed overhead."
          footnote={`${money(Math.abs(current.netProfit - previous.netProfit))} ${current.netProfit < previous.netProfit ? "worse" : "better"} than ${previous.label}`}
          href="/story"
        />

        {/* Margin against its break-even reference. Spans the row below 2xl so
            the tile grid never leaves a hole. */}
        <Card className="sm:col-span-2 lg:col-span-4 2xl:col-span-1" interactive>
          <div className="flex flex-row items-center gap-5 2xl:flex-col 2xl:gap-1">
            <div className="2xl:w-full">
              <span className="text-[12px] font-medium text-ink-3">Net margin</span>
            </div>
            <MarginGauge value={current.netMarginPct} min={-3} max={6} target={0} size={132} label="break-even at 0%" />
            <p className="max-w-[190px] text-[11.5px] leading-snug text-ink-3 2xl:mt-2 2xl:max-w-none 2xl:text-center">
              <strong className={current.netMarginPct < 0 ? "text-critical-ink" : "text-good-ink"}>
                {Math.abs(current.netMarginPct - previous.netMarginPct).toFixed(2)}pp{" "}
                {current.netMarginPct < previous.netMarginPct ? "down" : "up"}
              </strong>{" "}
              on {pct(previous.netMarginPct, 2)} last month
            </p>

            {/* Only shown while the card is spanning the row — keeps the
                narrow 2xl tile uncluttered. */}
            <dl className="ml-auto hidden gap-8 sm:flex 2xl:hidden">
              {[
                { k: "Break-even ROAS", v: current.breakEvenRoas.toFixed(2), n: `running ${current.roas.toFixed(2)}` },
                { k: "Contribution / order", v: money(current.contributionPerOrder), n: `less ${money(current.fixedPerOrder)} overhead` },
                { k: "Net per order", v: money(current.netProfit / current.orders), n: `${num(current.orders)} orders` },
              ].map((s2) => (
                <div key={s2.k}>
                  <dt className="text-[11px] font-medium text-ink-4">{s2.k}</dt>
                  <dd className="figure-lg mt-0.5 text-[17px] text-ink">{s2.v}</dd>
                  <dd className="text-[10.5px] text-ink-4">{s2.n}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Card>
      </div>

      {/* ------------------------------------------------ filters + health --- */}
      <div className="mt-4 space-y-3">
        <FilterBar />
        <CompletenessStrip />
      </div>

      {/* --------------------------------------------------------- charts --- */}
      <div className={cn("mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3", isPending && "is-pending")}>
        <ChartCard
          className="xl:col-span-2"
          title="Performance over time"
          subtitle="Cost stack against the revenue it has to fit inside, with net profit on its own scale below."
          info="Two panels rather than two y-axes: a single plot with two scales invents a relationship the data does not contain."
          table={{
            columns: ["Month", "Revenue", "COGS", "Operations", "Marketing", "Net profit"],
            rows: visibleMonths.map((m) => [
              m.label,
              money(m.totalRevenue),
              money(m.cogs),
              money(m.totalOperationalCosts),
              money(m.totalMarketing),
              money(m.netProfit),
            ]),
          }}
        >
          <PerformancePanels months={visibleMonths} />
        </ChartCard>

        <ChartCard
          title="Where your rupee goes"
          subtitle={`Every ₹100 of ${current.label} revenue, and how last month compares.`}
          info="Segments are labelled directly so the composition is readable without hovering, and the marker shows where spending crossed the revenue line."
        >
          <RupeeRuler current={current} previous={previous} />
        </ChartCard>
      </div>

      <div className={cn("mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3", isPending && "is-pending")}>
        <ChartCard
          title="Profit bridge"
          subtitle={`${current.label} revenue down to net profit`}
          table={{
            columns: ["Step", "Amount"],
            rows: bridge.map((b) => [b.label, money(b.value)]),
          }}
        >
          <Waterfall
            items={bridge.map((b) => ({
              label: b.label,
              value: b.value,
              kind: b.kind === "cost" ? "delta" : "anchor",
            }))}
            height={230}
          />
        </ChartCard>

        <Card className="flex flex-col">
          <CardHeader
            title="What the numbers say"
            subtitle="Generated from this month's movement"
            action={
              <Link href="/story" className="text-[12px] font-medium text-brand-ink hover:underline">
                Full story
              </Link>
            }
          />
          <div className="mt-3 flex-1">
            <InsightsList insights={insights.slice(0, 3)} />
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader
            title="Unit economics"
            subtitle={`An average ${money(current.aov)} order, broken down`}
            info="Contribution is what is left of one order after goods, fulfilment, fees and acquisition — before fixed overhead."
            action={
              <Link href="/unit-economics" className="text-[12px] font-medium text-brand-ink hover:underline">
                Detail
              </Link>
            }
          />
          <div className="mt-4">
            <PerOrderBar month={current} />
          </div>
          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-[12px]">
            {[
              { k: "Break-even ROAS", v: current.breakEvenRoas.toFixed(2), note: `running ${current.roas.toFixed(2)}` },
              { k: "Return rate", v: pct(current.returnRate), note: `${num(Math.round((current.returnRate / 100) * current.orders))} orders back` },
              { k: "Break-even CAC", v: money(current.breakEvenCac), note: `running ${money(current.cac)}` },
            ].map((r) => (
              <div key={r.k} className="flex items-baseline justify-between gap-2">
                <dt className="text-ink-3">{r.k}</dt>
                <dd className="flex items-baseline gap-1.5">
                  <span className="tnum font-semibold text-ink">{r.v}</span>
                  <span className="text-[11px] text-ink-4">{r.note}</span>
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-auto grid grid-cols-3 gap-2 pt-4">
            {[
              { label: "Contribution", value: money(current.contributionPerOrder), tone: current.contributionPerOrder >= 0 ? "good" : "bad" },
              { label: "Fixed / order", value: money(current.fixedPerOrder), tone: "neutral" },
              { label: "Net / order", value: money(current.netProfit / current.orders), tone: current.netProfit >= 0 ? "good" : "bad" },
            ].map((s) => (
              <div key={s.label} className="rounded-md border border-line bg-surface-2 px-2.5 py-2">
                <p className="text-[10.5px] font-medium text-ink-4">{s.label}</p>
                <p
                  className={cn(
                    "tnum mt-0.5 text-[14px] font-bold",
                    s.tone === "good" ? "text-good-ink" : s.tone === "bad" ? "text-critical-ink" : "text-ink",
                  )}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ------------------------------------------------------ statement --- */}
      <Card className="mt-3" padded>
        <CardHeader
          title="P&L summary"
          subtitle={`${visibleMonths[0]?.label} — ${current.label}`}
          action={
            <Link
              href="/statement"
              className="group inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              Open full statement
              <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          }
        />
        <div className="mt-4">
          <StatementTable months={visibleMonths.slice(-4)} condensed showMemo={false} />
        </div>
      </Card>
    </PageShell>
  );
}
