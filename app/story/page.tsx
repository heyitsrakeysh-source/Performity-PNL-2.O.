"use client";

import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Megaphone,
  Package,
  Percent,
  Receipt,
  ShoppingBag,
  Truck,
  Wallet,
} from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { attributeChange, buildInsights, type DriverImpact } from "@/lib/data/derived";
import { money, moneyCompact, num, pct } from "@/lib/format";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Bits";
import { Delta } from "@/components/ui/Delta";
import { Button } from "@/components/ui/Button";
import { Sparkline } from "@/components/charts/Sparkline";
import { Waterfall } from "@/components/charts/Waterfall";
import { TrendPanels } from "@/components/charts/TrendPanels";
import { ChartCard } from "@/components/charts/primitives";
import { InsightsList } from "@/components/pnl/InsightsList";
import { cn } from "@/lib/cn";

const DRIVER_ICON: Record<string, typeof Megaphone> = {
  volume: ShoppingBag,
  aov: Banknote,
  cogs: Package,
  shipping: Truck,
  packaging: Package,
  fees: Percent,
  cac: Megaphone,
  fixed: Receipt,
  othermkt: Megaphone,
};

const ACTION: Record<string, { label: string; href: string; body: string }> = {
  cac: { label: "Review campaigns", href: "/unit-economics", body: "Cut spend on the campaigns feeding loss-making SKUs and reallocate to winners." },
  cogs: { label: "Double down on SKU mix", href: "/unit-economics", body: "Push volume toward the high-margin styles that improved the blend." },
  shipping: { label: "Audit shipping", href: "/explorer", body: "Renegotiate courier rates and incentivise prepaid over COD." },
  volume: { label: "See volume detail", href: "/unit-economics", body: "Growth is only worth having where contribution per order is positive." },
  aov: { label: "Review pricing", href: "/explorer", body: "Bundle or raise price on the styles carrying the discount load." },
  fixed: { label: "Review overheads", href: "/statement", body: "Fixed cost per order is the lever that decides whether contribution survives." },
  fees: { label: "Check payment mix", href: "/statement", body: "Gateway and COD fees move with payment method share." },
  packaging: { label: "Review packaging", href: "/statement", body: "Packaging spend per order should track order growth, not outpace it." },
  othermkt: { label: "Review retainers", href: "/statement", body: "Non-media marketing is fixed cost dressed as growth spend." },
};

export default function StoryPage() {
  const { current, previous, months } = useWorkspace();

  const drivers = attributeChange(previous, current);
  const insights = buildInsights(previous, current);
  const netChange = current.netProfit - previous.netProfit;
  const worst = drivers.find((d) => d.impact < 0);
  const trail12 = months.slice(-12);

  const headline =
    current.netProfit < 0
      ? `${current.label.split(" ")[0]} profit fell to ${money(current.netProfit)}.`
      : `${current.label.split(" ")[0]} profit landed at ${money(current.netProfit)}.`;

  return (
    <PageShell>
      <PageHeader
        eyebrow={
          <>
            <Chip tone="brand">{current.label}</Chip>
            <Chip tone={netChange < 0 ? "critical" : "good"}>
              {money(netChange, { sign: true })} vs {previous.label}
            </Chip>
          </>
        }
        title={
          <>
            {headline}{" "}
            <span className="text-brand-ink">
              {worst ? `${worst.label} is the cause.` : "Costs held steady."}
            </span>
          </>
        }
        subtitle={
          <>
            In {current.label} you booked {money(current.totalRevenue)} of revenue across{" "}
            {num(current.orders)} orders and kept {money(current.netProfit)}. Compared with {previous.label} net
            profit moved by {money(netChange, { sign: true })}. The breakdown below attributes every rupee of that
            move to a specific driver — the parts sum to the whole with no residual.
          </>
        }
        actions={<Button href="/forecast" variant="primary" iconRight={<ArrowRight size={14} />}>See where the month lands</Button>}
      />

      {/* ------------------------------------------------- earned / kept --- */}
      <div className="mt-6 grid grid-cols-1 items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <FlowCard
          icon={<Banknote size={18} />}
          label="You earned"
          value={moneyCompact(current.totalRevenue)}
          delta={<Delta current={current.totalRevenue} previous={previous.totalRevenue} size="sm" />}
          note={`${num(current.orders)} orders at ${money(current.aov)} average order value.`}
          tone="brand"
        />
        <Arrow />
        <FlowCard
          icon={<Receipt size={18} />}
          label="You spent"
          value={moneyCompact(current.totalRevenue - current.netProfit)}
          delta={
            <Delta
              current={current.totalRevenue - current.netProfit}
              previous={previous.totalRevenue - previous.netProfit}
              higherIsBetter={false}
              size="sm"
            />
          }
          note={`${pct(((current.totalRevenue - current.netProfit) / current.totalRevenue) * 100)} of revenue, led by ${moneyCompact(current.totalMarketing)} of marketing.`}
          tone="warning"
        />
        <Arrow />
        <FlowCard
          icon={<Wallet size={18} />}
          label="You kept"
          value={money(current.netProfit)}
          delta={<Delta current={current.netProfit} previous={previous.netProfit} size="sm" />}
          note={`A ${pct(Math.abs(current.netMarginPct), 2)} ${current.netProfit < 0 ? "loss" : "margin"} — ${money(Math.abs(current.netProfit / current.orders))} ${current.netProfit < 0 ? "lost" : "kept"} on every order.`}
          tone={current.netProfit < 0 ? "critical" : "good"}
          emphasis
        />
      </div>

      {/* ------------------------------------------------------ waterfall --- */}
      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[1.55fr_1fr]">
        <ChartCard
          title="Why profit changed"
          subtitle={`Every driver between ${previous.label} and ${current.label}`}
          info="Drivers are substituted one at a time into the same profit equation, so the bars sum exactly to the change in net profit."
          table={{
            columns: ["Driver", "Impact on net profit", "Detail"],
            rows: [
              [previous.label, money(previous.netProfit), "Starting point"],
              ...drivers.map((d) => [d.label, money(d.impact), d.detail]),
              [current.label, money(current.netProfit), "Ending point"],
            ],
          }}
        >
          <Waterfall
            height={270}
            labelLines={2}
            items={[
              { label: previous.label, value: previous.netProfit, kind: "anchor" },
              ...drivers.map((d) => ({ label: d.label, value: d.impact, kind: "delta" as const, detail: d.detail })),
              { label: current.label, value: current.netProfit, kind: "anchor" },
            ]}
          />
        </ChartCard>

        <Card className="flex flex-col">
          <CardHeader title="Top drivers" subtitle="Ranked by rupee impact, with the move each one calls for" />
          <ul className="mt-3 space-y-2.5">
            {drivers.slice(0, 3).map((d, i) => (
              <DriverRow key={d.id} driver={d} rank={i + 1} />
            ))}
          </ul>
          <p className="mt-auto pt-4 text-[11.5px] text-ink-4">
            {drivers.length} drivers account for the full {money(Math.abs(netChange))} move.
          </p>
        </Card>
      </div>

      {/* ------------------------------------------------- unit economics --- */}
      <Card className="mt-4">
        <CardHeader
          title="Unit economics, month on month"
          subtitle="The per-order numbers underneath the change"
          action={
            <Link href="/unit-economics" className="text-[12px] font-medium text-brand-ink hover:underline">
              Full breakdown
            </Link>
          }
        />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "AOV", value: current.aov, prev: previous.aov, fmt: money, better: true, get: (m: typeof current) => m.aov },
            { label: "COGS / order", value: current.cogsPerOrder, prev: previous.cogsPerOrder, fmt: money, better: false, get: (m: typeof current) => m.cogsPerOrder },
            { label: "Shipping / order", value: current.shippingPerOrder, prev: previous.shippingPerOrder, fmt: money, better: false, get: (m: typeof current) => m.shippingPerOrder },
            { label: "CAC", value: current.cac, prev: previous.cac, fmt: money, better: false, get: (m: typeof current) => m.cac },
            { label: "Contribution / order", value: current.contributionPerOrder, prev: previous.contributionPerOrder, fmt: money, better: true, get: (m: typeof current) => m.contributionPerOrder },
            { label: "Break-even ROAS", value: current.breakEvenRoas, prev: previous.breakEvenRoas, fmt: (v: number) => v.toFixed(2), better: false, get: (m: typeof current) => m.breakEvenRoas },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-line bg-surface-2 p-3">
              <p className="text-[11.5px] font-medium text-ink-3">{s.label}</p>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-1.5">
                <span className="figure-lg text-[19px] text-ink">{s.fmt(s.value)}</span>
                <Delta current={s.value} previous={s.prev} higherIsBetter={s.better} size="sm" />
              </div>
              <Sparkline
                values={trail12.map(s.get)}
                height={26}
                color={s.better ? "var(--series-3)" : "var(--series-5)"}
                fill={false}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* ------------------------------------------------------- 12 month --- */}
      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[1.55fr_1fr]">
        <ChartCard
          title="Twelve-month profitability"
          subtitle="Net profit in rupees, net margin as a rate — each on its own scale."
          info="Two units never share one y-axis. The upper panel is money; the lower panel is a rate."
          table={{
            columns: ["Month", "Revenue", "Net profit", "Net margin"],
            rows: trail12.map((m) => [m.label, money(m.totalRevenue), money(m.netProfit), pct(m.netMarginPct, 2)]),
          }}
        >
          <TrendPanels months={trail12} />
        </ChartCard>

        <Card className="flex flex-col">
          <CardHeader title="What the numbers say" subtitle="Read straight off the movement" />
          <div className="mt-3 flex-1">
            <InsightsList insights={insights} href="/explorer" />
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

/* ------------------------------------------------------------------------ */

function Arrow() {
  return (
    <div className="hidden items-center justify-center text-ink-4 lg:flex">
      <ArrowRight size={18} />
    </div>
  );
}

function FlowCard({
  icon,
  label,
  value,
  delta,
  note,
  tone,
  emphasis,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: React.ReactNode;
  note: string;
  tone: "brand" | "warning" | "good" | "critical";
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border bg-surface p-4 shadow-xs transition-[box-shadow,transform] duration-200 hover:-translate-y-px hover:shadow-md",
        emphasis ? "border-line-strong" : "border-line",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg",
            tone === "brand" && "bg-brand-soft text-brand-ink",
            tone === "warning" && "bg-warning-soft text-warning-ink",
            tone === "good" && "bg-good-soft text-good-ink",
            tone === "critical" && "bg-critical-soft text-critical-ink",
          )}
        >
          {icon}
        </span>
        <span className="text-[12.5px] font-medium text-ink-3">{label}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-2">
        <span
          className={cn(
            "figure-lg text-[27px] leading-none",
            tone === "critical" ? "text-critical-ink" : tone === "good" ? "text-good-ink" : "text-ink",
          )}
        >
          {value}
        </span>
        {delta}
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-3">{note}</p>
    </div>
  );
}

function DriverRow({ driver, rank }: { driver: DriverImpact; rank: number }) {
  const Icon = DRIVER_ICON[driver.id] ?? Megaphone;
  const action = ACTION[driver.id];
  const bad = driver.impact < 0;

  return (
    <li className="rounded-lg border border-line bg-surface-2 p-3">
      <div className="flex items-start gap-2.5">
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-surface text-[11px] font-bold text-ink-3 ring-1 ring-line">
          {rank}
        </span>
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg",
            bad ? "bg-critical-soft text-critical-ink" : "bg-good-soft text-good-ink",
          )}
        >
          <Icon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
            <span className="text-[13px] font-semibold text-ink">{driver.label}</span>
            <span className={cn("tnum text-[13px] font-bold", bad ? "text-critical-ink" : "text-good-ink")}>
              {money(driver.impact, { sign: true })}
            </span>
          </div>
          <p className="mt-1 text-[11.5px] leading-snug text-ink-3">{driver.detail}</p>
          {action ? (
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[11px] leading-snug text-ink-4">{action.body}</p>
              <Link
                href={action.href}
                className="shrink-0 rounded-md border border-line bg-surface px-2 py-1 text-[11px] font-medium text-brand-ink transition-colors hover:border-brand"
              >
                {action.label}
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
