"use client";

import { Bell, Calendar, FileText, Mail, Printer, Smartphone } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { attributeChange, dailyPacing, pacingSummary } from "@/lib/data/derived";
import { losingSkus, skuRowsFor, totalSkuLoss } from "@/lib/data/skus";
import { money, moneyCompact, num, pct } from "@/lib/format";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Delta } from "@/components/ui/Delta";
import { Sparkline } from "@/components/charts/Sparkline";
import { TrendPanels } from "@/components/charts/TrendPanels";
import { Logo } from "@/components/shell/Logo";
import { useToast } from "@/components/shell/Toast";
import { cn } from "@/lib/cn";
import { useMemo, useState } from "react";

export default function ReportsPage() {
  const { current, comparison, months, visibleMonths, brand } = useWorkspace();
  const { push } = useToast();
  const [schedule, setSchedule] = useState({ daily: true, weekly: true, monthly: true, alerts: true });

  const skuRows = useMemo(() => skuRowsFor(current), [current]);
  const losers = useMemo(() => losingSkus(skuRows), [skuRows]);
  const skuLoss = useMemo(() => totalSkuLoss(skuRows), [skuRows]);
  const trail12 = visibleMonths.length > 1 ? visibleMonths : months.slice(-12);
  const pacing = pacingSummary(current);
  const drivers = attributeChange(comparison, current);
  const yesterday = dailyPacing(current)[pacing.dayOfMonth - 1];

  const fixes = [
    {
      n: 1,
      title: `Bring CAC back to break-even`,
      body: `Cutting blended CAC by ${money(-current.netProfit / current.orders)} an order restores break-even at today's volume.`,
      impact: money(-current.netProfit),
    },
    {
      n: 2,
      title: `Retire the ${losers.length} loss-making SKUs`,
      body: `They consume ${money(Math.abs(skuLoss))} of contribution while carrying ${pct((losers.reduce((s, x) => s + x.orders, 0) / current.orders) * 100)} of order volume.`,
      impact: money(Math.abs(skuLoss)),
    },
    {
      n: 3,
      title: `Bring the return rate to 6%`,
      body: `Returns are running at ${pct(current.returnRate)}. Each point costs roughly ${money((current.totalRevenue * 0.01 * current.grossMarginPct) / 100)} of gross profit.`,
      impact: money(((current.returnRate - 6) / 100) * current.totalRevenue * (current.grossMarginPct / 100)),
    },
  ];

  return (
    <PageShell>
      <div data-print-hide>
      <PageHeader
        eyebrow={<Chip tone="brand">{current.label}</Chip>}
        title="Reports"
        subtitle="The board pack and the daily digest, generated from the same model the dashboard reads. The sheet below is laid out for A4 and prints without any of the app chrome."
        actions={
          <>
            <Button icon={<Mail size={14} />} onClick={() => push({ title: "Report emailed", body: "Delivery is a demo action, connect your mail provider.", tone: "info" })}>
              Email to board
            </Button>
            <Button variant="primary" icon={<Printer size={14} />} onClick={() => window.print()}>
              Print / save as PDF
            </Button>
          </>
        }
      />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_336px]">
        {/* ------------------------------------------------- board report --- */}
        <div className="print-sheet overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
          <div className="border-b border-line px-8 py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Logo size={26} />
                <span className="text-[15px] font-bold tracking-[-0.03em] text-ink">performity</span>
              </div>
              <p className="text-[11px] text-ink-4">Generated 25 Aug 2026</p>
            </div>

            <h2 className="mt-6 text-[24px] font-bold tracking-[-0.025em] text-ink">
              {brand.name} Monthly Profitability Report
            </h2>
            <p className="mt-1 text-[14px] font-semibold text-brand-ink">{current.label}</p>

            <p className="mt-5 max-w-2xl text-[19px] leading-snug font-bold tracking-[-0.02em] text-ink">
              {current.netProfit < 0 ? "The month is running at a loss of " : "The month is profitable at "}
              <span className={current.netProfit < 0 ? "text-critical-ink" : "text-good-ink"}>
                {money(Math.abs(current.netProfit))}
              </span>
              . {drivers[0] ? `${drivers[0].label} is the primary driver.` : ""}
            </p>
          </div>

          {/* headline figures */}
          <div className="grid grid-cols-2 divide-x divide-line border-b border-line md:grid-cols-4">
            {[
              { k: "Total revenue", v: moneyCompact(current.totalRevenue), cur: current.totalRevenue, prev: comparison.totalRevenue, better: true },
              { k: "Gross margin", v: pct(current.grossMarginPct), cur: current.grossMarginPct, prev: comparison.grossMarginPct, better: true, pp: true },
              { k: "Net profit", v: money(current.netProfit), cur: current.netProfit, prev: comparison.netProfit, better: true, emphasis: true },
              { k: "Net margin", v: pct(current.netMarginPct, 2), cur: current.netMarginPct, prev: comparison.netMarginPct, better: true, pp: true, emphasis: true },
            ].map((s) => (
              <div key={s.k} className="px-6 py-4">
                <p className="text-[11.5px] font-medium text-ink-3">{s.k}</p>
                <p
                  className={cn(
                    "figure-lg mt-1 text-[21px]",
                    s.emphasis && current.netProfit < 0 ? "text-critical-ink" : "text-ink",
                  )}
                >
                  {s.v}
                </p>
                <Delta current={s.cur} previous={s.prev} higherIsBetter={s.better} mode={s.pp ? "pp" : "pct"} size="sm" className="mt-1.5" />
              </div>
            ))}
          </div>

          {/* trend */}
          <div className="border-b border-line px-8 py-6">
            <h3 className="text-[13px] font-semibold text-ink">Net profit and margin over the last twelve months</h3>
            <div className="mt-3">
              <TrendPanels months={trail12} height={230} />
            </div>
          </div>

          {/* statement summary + fixes */}
          <div className="grid grid-cols-1 divide-line lg:grid-cols-2 lg:divide-x">
            <div className="px-8 py-6">
              <h3 className="text-[13px] font-semibold text-ink">P&amp;L summary for {current.label}</h3>
              <table className="mt-3 w-full border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="pb-2 text-left text-[10.5px] font-semibold tracking-wide text-ink-3 uppercase">Line item</th>
                    <th scope="col" className="pb-2 text-right text-[10.5px] font-semibold tracking-wide text-ink-3 uppercase">Amount</th>
                    <th scope="col" className="pb-2 text-right text-[10.5px] font-semibold tracking-wide text-ink-3 uppercase">% rev</th>
                    <th scope="col" className="pb-2 text-right text-[10.5px] font-semibold tracking-wide text-ink-3 uppercase">MoM</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { k: "Total revenue", v: current.totalRevenue, p: comparison.totalRevenue, better: true },
                    { k: "Total COGS", v: current.cogs, p: comparison.cogs, better: false },
                    { k: "Gross profit", v: current.grossProfit, p: comparison.grossProfit, better: true, strong: true },
                    { k: "Operational costs", v: current.totalOperationalCosts, p: comparison.totalOperationalCosts, better: false },
                    { k: "Marketing expenses", v: current.totalMarketing, p: comparison.totalMarketing, better: false },
                    { k: "Net profit", v: current.netProfit, p: comparison.netProfit, better: true, strong: true, final: true },
                  ].map((r) => (
                    <tr key={r.k} className={cn("border-b border-line-soft", r.final && "border-t-2 border-line")}>
                      <td className={cn("py-2 text-ink-2", r.strong && "font-semibold text-ink")}>{r.k}</td>
                      <td
                        className={cn(
                          "tnum py-2 text-right font-medium text-ink",
                          r.final && (r.v < 0 ? "font-bold text-critical-ink" : "font-bold text-good-ink"),
                        )}
                      >
                        {money(r.v)}
                      </td>
                      <td className="tnum py-2 text-right text-ink-3">{pct((r.v / current.totalRevenue) * 100)}</td>
                      <td className="py-2 text-right">
                        <Delta current={r.v} previous={r.p} higherIsBetter={r.better} size="sm" showArrow={false} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-8 py-6">
              <h3 className="text-[13px] font-semibold text-ink">Three things to fix</h3>
              <ol className="mt-3 space-y-3.5">
                {fixes.map((f) => (
                  <li key={f.n} className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-bold text-brand-ink">
                      {f.n}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-[12.5px] font-semibold text-ink">{f.title}</p>
                        <p className="tnum shrink-0 text-[12.5px] font-bold text-good-ink">+{f.impact}</p>
                      </div>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">{f.body}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-5 rounded-lg border border-line bg-surface-2 p-3.5">
                <p className="text-[11.5px] font-semibold text-ink">Month-end projection</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">
                  On the current run rate {current.label} closes at{" "}
                  <strong className={pacing.projectedNetProfit < 0 ? "text-critical-ink" : "text-good-ink"}>
                    {money(pacing.projectedNetProfit)}
                  </strong>{" "}
                  (± {money(pacing.band)}), against a break-even ROAS of {current.breakEvenRoas.toFixed(2)} versus{" "}
                  {current.roas.toFixed(2)} running.
                </p>
              </div>
            </div>
          </div>

          <footer className="flex items-center justify-between border-t border-line px-8 py-4 text-[10.5px] text-ink-4">
            <span>Confidential. Prepared for the internal use of {brand.name}.</span>
            <span>Performity · generated from the live model</span>
          </footer>
        </div>

        {/* ------------------------------------------------ digest + rules --- */}
        <aside className="space-y-3" data-print-hide>
          <Card>
            <CardHeader
              title="Daily digest"
              subtitle="What lands in your inbox each morning"
              action={<Smartphone size={15} className="text-ink-4" />}
            />
            <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface-2">
              <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
                <div className="flex items-center gap-2">
                  <Logo size={20} />
                  <span className="text-[13px] font-bold tracking-[-0.03em] text-ink">performity</span>
                </div>
                <span className="relative">
                  <Bell size={15} className="text-ink-3" />
                  <span className="absolute -top-1 -right-1 grid size-[13px] place-items-center rounded-full bg-critical text-[8px] font-bold text-white">
                    3
                  </span>
                </span>
              </div>

              <div className="p-4">
                <p className="text-[11px] text-ink-4">Yesterday · 24 Aug</p>
                <p className="mt-0.5 text-[13px] font-semibold text-ink">Yesterday&apos;s contribution</p>
                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                  <span className="figure-lg text-[26px] text-good-ink">
                    {money(yesterday.orders * current.contributionPerOrder)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-ink-3">
                  less {money(current.fixedCost / 31)} of daily overhead,{" "}
                  <strong className={yesterday.daily < 0 ? "text-critical-ink" : "text-good-ink"}>
                    {money(yesterday.daily)} net
                  </strong>
                </p>

                <ul className="mt-4 divide-y divide-line-soft">
                  {[
                    { k: "Orders", v: num(yesterday.orders), series: dailyPacing(current).slice(0, pacing.dayOfMonth).map((d) => d.orders) },
                    { k: "Revenue", v: money(yesterday.orders * current.aov), series: dailyPacing(current).slice(0, pacing.dayOfMonth).map((d) => d.orders * current.aov) },
                    { k: "MTD net profit", v: money(pacing.mtdNetProfit), series: dailyPacing(current).slice(0, pacing.dayOfMonth).map((d) => d.cumulative) },
                  ].map((r) => (
                    <li key={r.k} className="flex items-center gap-3 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11.5px] text-ink-3">{r.k}</span>
                        <span className="tnum block text-[13px] font-semibold text-ink">{r.v}</span>
                      </span>
                      <span className="w-[74px] shrink-0">
                        <Sparkline values={r.series} height={26} color="var(--brand)" />
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 rounded-lg border border-line bg-warning-soft p-3">
                  <p className="text-[12px] font-semibold text-warning-ink">
                    {losers[0].name} is selling below cost
                  </p>
                  <p className="tnum mt-0.5 text-[11.5px] text-warning-ink">
                    {money(losers[0].contributionPerOrder)} per order
                  </p>
                </div>

                <Button variant="primary" href="/overview" className="mt-3 w-full">
                  Open full report
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Delivery schedule" subtitle="Who gets what, and when" />
            <ul className="mt-3 divide-y divide-line-soft">
              {[
                { id: "daily", icon: Smartphone, label: "Daily digest", note: "07:30 IST · founders" },
                { id: "weekly", icon: Calendar, label: "Weekly summary", note: "Monday 09:00 · leadership" },
                { id: "monthly", icon: FileText, label: "Board pack PDF", note: "3rd of the month · board" },
                { id: "alerts", icon: Bell, label: "Guardrail alerts", note: "Real time · Slack + email" },
              ].map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-3 text-ink-3">
                    <r.icon size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-medium text-ink">{r.label}</span>
                    <span className="block text-[11px] text-ink-4">{r.note}</span>
                  </span>
                  <Toggle
                    checked={schedule[r.id as keyof typeof schedule]}
                    onChange={(v) => setSchedule((s) => ({ ...s, [r.id]: v }))}
                    label={r.label}
                  />
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </PageShell>
  );
}
