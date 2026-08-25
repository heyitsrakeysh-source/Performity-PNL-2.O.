"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Bell, Info, Target, TrendingDown } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { benchmarks, dailyPacing, pacingSummary } from "@/lib/data/derived";
import { LOSING_SKUS, TOTAL_SKU_LOSS } from "@/lib/data/skus";
import { ALERTS } from "@/lib/data/workspace";
import { money, moneyCompact, num, pct } from "@/lib/format";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Chip, StatusBadge } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { ChartCard } from "@/components/charts/primitives";
import { ProjectionChart } from "@/components/charts/Projection";
import { BreakEvenTrack, BulletRow } from "@/components/charts/Misc";
import { MiniBar } from "@/components/charts/MiniBar";
import { cn } from "@/lib/cn";

export default function ForecastPage() {
  const { current, previous } = useWorkspace();

  const pacing = pacingSummary(current);
  const prevSeries = dailyPacing(previous).map((d) => d.cumulative);
  const gap = -current.netProfit; // rupees of improvement needed to break even
  const losing = current.netProfit < 0;

  /* Each lever is solved from the same profit equation, holding everything else fixed. */
  const levers = [
    {
      id: "cac",
      label: "Cut acquisition cost",
      need: `${money(gap / current.orders)} per order`,
      detail: `CAC from ${money(current.cac)} to ${money(current.cac - gap / current.orders)} — a ${pct((gap / current.orders / current.cac) * 100)} reduction.`,
      icon: TrendingDown,
    },
    {
      id: "aov",
      label: "Raise average order value",
      need: `${money(gap / current.orders)} per order`,
      detail: `AOV from ${money(current.aov)} to ${money(current.aov + gap / current.orders)} through bundling or price.`,
      icon: Target,
    },
    {
      id: "volume",
      label: "Sell more at today's economics",
      need: `${num(Math.ceil(gap / Math.max(current.contributionPerOrder, 1)))} extra orders`,
      detail: `Each order contributes ${money(current.contributionPerOrder)} before overhead, so volume alone can close the gap — but only while contribution stays positive.`,
      icon: Target,
    },
    {
      id: "skus",
      label: "Stop the loss-making SKUs",
      need: money(Math.abs(TOTAL_SKU_LOSS)),
      detail: `${LOSING_SKUS.length} SKUs are contribution-negative. Removing their loss alone would more than close a ${money(gap)} gap.`,
      icon: AlertTriangle,
    },
    {
      id: "fixed",
      label: "Reduce fixed overhead",
      need: money(gap),
      detail: `Fixed cost is ${moneyCompact(current.fixedCost)} a month, or ${money(current.fixedPerOrder)} per order at current volume.`,
      icon: TrendingDown,
    },
  ];

  const bench = benchmarks(current);

  return (
    <PageShell>
      <PageHeader
        eyebrow={
          <>
            <Chip tone="brand">{current.label}</Chip>
            <StatusBadge status="warning" label={`Day ${pacing.dayOfMonth} of ${pacing.daysInMonth}`} />
          </>
        }
        title={
          losing ? (
            <>
              On track to {pacing.projectedNetProfit < 0 ? "lose" : "make"}{" "}
              <span className="text-critical-ink">{money(Math.abs(pacing.projectedNetProfit))}</span> this month.
            </>
          ) : (
            <>
              On track for <span className="text-good-ink">{money(pacing.projectedNetProfit)}</span> this month.
            </>
          )
        }
        subtitle={
          <>
            Month-to-date net profit is {money(pacing.mtdNetProfit)} across {pacing.dayOfMonth} days. Holding the
            current run rate, the month closes at {money(pacing.projectedNetProfit)} give or take{" "}
            {money(pacing.band)}. Break-even needs {money(gap)} of improvement.
          </>
        }
        actions={
          <Button href="/explorer" variant="primary" iconRight={<ArrowRight size={14} />}>
            Model a fix
          </Button>
        }
      />

      {/* ------------------------------------------------------ projection --- */}
      <div className="mt-6 grid grid-cols-1 gap-3 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard
          title="Profit projection"
          subtitle="Cumulative net profit through the month, with a confidence band on the days still to come"
          info="Solid is booked. Dashed and shaded is modelled from the current run rate — the only dashed marks in the product mean exactly that."
          table={{
            columns: ["Day", "Cumulative", "That day", "Orders", "Status"],
            rows: pacing.series.map((d) => [
              d.day,
              money(d.cumulative),
              money(d.daily),
              num(d.orders),
              d.isProjected ? "Projected" : "Actual",
            ]),
          }}
          action={
            <div className="hidden items-center gap-3 text-[11px] text-ink-3 sm:flex">
              <span className="flex items-center gap-1.5">
                <svg width={14} height={6} aria-hidden>
                  <line x1={0} y1={3} x2={14} y2={3} stroke="var(--brand)" strokeWidth={2} />
                </svg>
                Actual
              </span>
              <span className="flex items-center gap-1.5">
                <svg width={14} height={6} aria-hidden>
                  <line x1={0} y1={3} x2={14} y2={3} stroke="var(--brand)" strokeWidth={2} strokeDasharray="3 3" />
                </svg>
                Projected
              </span>
              <span className="flex items-center gap-1.5">
                <svg width={14} height={6} aria-hidden>
                  <line x1={0} y1={3} x2={14} y2={3} stroke="var(--ink-4)" strokeWidth={1.5} />
                </svg>
                {previous.label}
              </span>
            </div>
          }
        >
          <ProjectionChart series={pacing.series} today={pacing.dayOfMonth} comparison={prevSeries} height={280} />
        </ChartCard>

        <Card className="flex flex-col">
          <CardHeader
            title="Break-even analysis"
            subtitle="The return on ad spend this cost base needs"
            info="Break-even ROAS is the point where net profit would be exactly zero, holding every other driver constant."
          />
          <BreakEvenTrack month={current} />

          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4">
            {[
              { k: "Contribution / order", v: money(current.contributionPerOrder), tone: current.contributionPerOrder >= 0 ? "good" : "bad" },
              { k: "CAC", v: money(current.cac), tone: "ink" },
              { k: "AOV", v: money(current.aov), tone: "ink" },
            ].map((s) => (
              <div key={s.k}>
                <p className="text-[10.5px] font-medium text-ink-4">{s.k}</p>
                <p
                  className={cn(
                    "figure-lg mt-0.5 text-[17px]",
                    s.tone === "good" ? "text-good-ink" : s.tone === "bad" ? "text-critical-ink" : "text-ink",
                  )}
                >
                  {s.v}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-auto flex items-start gap-2 rounded-md border border-line bg-surface-2 px-3 py-2.5">
            <Info size={13} className="mt-px shrink-0 text-ink-4" />
            <p className="text-[11.5px] leading-relaxed text-ink-3">
              Contribution per order is {money(current.contributionPerOrder)} but fixed cost absorbs{" "}
              {money(current.fixedPerOrder)} of it. That {money(current.contributionPerOrder - current.fixedPerOrder)}{" "}
              gap per order is the whole story of the month.
            </p>
          </div>
        </Card>
      </div>

      {/* ---------------------------------------------------------- levers --- */}
      <Card className="mt-4">
        <CardHeader
          title={`Five ways to close a ${money(gap)} gap`}
          subtitle="Each lever is solved from the same profit equation, holding every other driver constant"
          action={
            <Link href="/explorer" className="text-[12px] font-medium text-brand-ink hover:underline">
              Simulate combinations
            </Link>
          }
        />
        <ul className="stagger mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {levers.map((l, i) => (
            <li
              key={l.id}
              style={{ ["--i" as string]: i }}
              className="group rounded-lg border border-line bg-surface-2 p-3.5 transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-px hover:border-line-strong hover:shadow-sm"
            >
              <div className="flex items-start gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink">
                  <l.icon size={15} />
                </span>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-ink">{l.label}</p>
                  <p className="tnum mt-0.5 text-[15px] font-bold text-brand-ink">{l.need}</p>
                </div>
              </div>
              <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-3">{l.detail}</p>
            </li>
          ))}
        </ul>
      </Card>

      {/* -------------------------------------------- losing SKUs / bench --- */}
      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader
            title="Losing SKUs"
            subtitle={`${LOSING_SKUS.length} items, ${money(TOTAL_SKU_LOSS)} of contribution`}
            action={
              <Link href="/unit-economics" className="text-[12px] font-medium text-brand-ink hover:underline">
                All SKUs
              </Link>
            }
          />
          <ul className="mt-3 divide-y divide-line-soft">
            {LOSING_SKUS.slice(0, 6).map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <span className="tnum w-4 shrink-0 text-[11px] font-semibold text-ink-4">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium text-ink">{s.name}</span>
                  <span className="mt-1 block">
                    <MiniBar value={s.totalContribution} max={Math.abs(LOSING_SKUS[0].totalContribution)} tone="critical" width={90} />
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="tnum block text-[12.5px] font-bold text-critical-ink">{money(s.totalContribution)}</span>
                  <span className="tnum block text-[10.5px] text-ink-4">{money(s.contributionPerOrder)}/order</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Against the peer median"
            subtitle="D2C footwear brands at a similar revenue band"
            info="Peer figures are illustrative in the prototype — wire them to your benchmarking source."
          />
          <div className="mt-2 divide-y divide-line-soft">
            {bench.map((b) => (
              <BulletRow
                key={b.id}
                label={b.label}
                you={b.you}
                peer={b.peer}
                higherIsBetter={b.higherIsBetter}
                max={Math.max(b.you, b.peer) * 1.25}
                format={(v) =>
                  `${b.prefix ?? ""}${b.decimals ? v.toFixed(b.decimals) : Math.round(v).toLocaleString("en-IN")}${b.suffix ?? ""}`
                }
              />
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Alerts"
            subtitle="Guardrails that fired this period"
            action={<Chip tone="critical">{ALERTS.filter((a) => a.severity === "critical").length} critical</Chip>}
          />
          <ul className="mt-3 space-y-2.5">
            {ALERTS.map((a) => (
              <li key={a.id} className="rounded-lg border border-line bg-surface-2 p-3">
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
                      a.severity === "critical" ? "bg-critical-soft text-critical-ink" : a.severity === "warning" ? "bg-warning-soft text-warning-ink" : "bg-brand-soft text-brand-ink",
                    )}
                  >
                    {a.severity === "info" ? <Bell size={13} /> : <AlertTriangle size={13} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-ink">{a.title}</p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">{a.detail}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[10.5px] text-ink-4">{a.time}</span>
                      <Link
                        href={a.action.href}
                        className="rounded-md border border-line bg-surface px-2 py-1 text-[11px] font-medium text-brand-ink transition-colors hover:border-brand"
                      >
                        {a.action.label}
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PageShell>
  );
}
