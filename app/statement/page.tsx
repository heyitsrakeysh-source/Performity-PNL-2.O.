"use client";

import { useState } from "react";
import { Download, MessageSquare, Pencil, Settings2, Sparkles } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { CELL_COMMENTS } from "@/lib/data/workspace";
import { money, num, pct } from "@/lib/format";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { FilterBar } from "@/components/shell/FilterBar";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip, StatusBadge } from "@/components/ui/Bits";
import { StatementTable } from "@/components/pnl/StatementTable";
import { EditDrawer, MissingBanner } from "@/components/pnl/EditDrawer";
import { Drawer } from "@/components/ui/Drawer";
import { CalculationPreferences } from "@/components/pnl/CalculationPreferences";
import { useToast } from "@/components/shell/Toast";
import { cn } from "@/lib/cn";

export default function StatementPage() {
  const { current, visibleMonths, completeness, editedCount } = useWorkspace();
  const { push } = useToast();
  const [editing, setEditing] = useState<string | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);

  return (
    <PageShell>
      <PageHeader
        eyebrow={
          <>
            <Chip tone="brand">P&amp;L statement</Chip>
            {editedCount > 0 ? <Chip tone="good">{editedCount} manual override{editedCount === 1 ? "" : "s"}</Chip> : null}
            <StatusBadge
              status={completeness.missing === 0 ? "good" : "warning"}
              label={`${completeness.pct.toFixed(0)}% complete`}
            />
          </>
        }
        title="Advanced P&L"
        subtitle="Monthly breakdown of sales, cost of goods, operations and marketing, down to net profit. Every sub-line foots to its total, and every total rolls into the bottom line, change one input and the whole statement recalculates."
        actions={
          <>
            <Button icon={<Settings2 size={14} />} onClick={() => setPrefsOpen(true)}>
              Calculation rules
            </Button>
            <Button
              icon={<Download size={14} />}
              onClick={() => push({ title: "Export queued", body: "XLSX export is a demo action in the prototype.", tone: "info" })}
            >
              Export
            </Button>
            <Button variant="primary" icon={<Pencil size={14} />} onClick={() => setEditing(current.key)}>
              Edit {current.label} inputs
            </Button>
          </>
        }
      />

      <div className="mt-5 space-y-3">
        <FilterBar showActions={false} />
        <MissingBanner count={completeness.missing} onReview={() => setEditing(current.key)} />
      </div>

      {/* --------------------------------------------------------- summary --- */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        {[
          { label: "Total revenue", value: money(current.totalRevenue), tone: "ink" },
          { label: "Gross profit", value: money(current.grossProfit), sub: pct(current.grossMarginPct), tone: "ink" },
          { label: "Operational costs", value: money(current.totalOperationalCosts), sub: pct((current.totalOperationalCosts / current.totalRevenue) * 100), tone: "ink" },
          { label: "Marketing", value: money(current.totalMarketing), sub: pct((current.totalMarketing / current.totalRevenue) * 100), tone: "ink" },
          { label: "Net profit", value: money(current.netProfit), sub: pct(current.netMarginPct, 2), tone: current.netProfit < 0 ? "bad" : "good" },
          { label: "Orders", value: num(current.orders), sub: `${money(current.aov)} AOV`, tone: "ink" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-line bg-surface p-3.5 shadow-xs">
            <p className="text-[11.5px] font-medium text-ink-3">{s.label}</p>
            <p
              className={cn(
                "figure-lg mt-1 text-[18px]",
                s.tone === "bad" ? "text-critical-ink" : s.tone === "good" ? "text-good-ink" : "text-ink",
              )}
            >
              {s.value}
            </p>
            {s.sub ? <p className="tnum mt-0.5 text-[11.5px] text-ink-4">{s.sub}</p> : null}
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------- statement --- */}
      <Card className="mt-4">
        <CardHeader
          title="Statement"
          subtitle={`${visibleMonths[0]?.label} to ${visibleMonths[visibleMonths.length - 1]?.label} · all values in ₹`}
          action={
            <span className="hidden items-center gap-1.5 text-[11.5px] text-ink-4 sm:flex">
              <Sparkles size={12} className="text-brand" />
              Click the pencil in any month header to edit that month
            </span>
          }
        />
        <div className="mt-4">
          <StatementTable months={visibleMonths} onEditMonth={setEditing} />
        </div>
      </Card>

      {/* -------------------------------------------------------- comments --- */}
      <Card className="mt-4">
        <CardHeader
          title="Discussion"
          subtitle="Threads anchored to statement rows, so questions stay next to the number that raised them"
          action={<Chip tone="brand">{CELL_COMMENTS.length} open</Chip>}
        />
        <ul className="mt-4 space-y-3">
          {CELL_COMMENTS.map((c) => (
            <li key={c.id} className="rounded-lg border border-line bg-surface-2 p-3.5">
              <div className="flex items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-bold text-white">
                  {c.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12.5px] font-semibold text-ink">{c.author}</span>
                    <Chip tone="neutral">
                      {c.rowId} · {c.monthKey}
                    </Chip>
                    <span className="text-[11px] text-ink-4">{c.time}</span>
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{c.body}</p>

                  {c.replies?.map((r, i) => (
                    <div key={i} className="mt-2.5 flex gap-2.5 rounded-md border border-line bg-surface p-2.5">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-3 text-[10px] font-bold text-ink-2">
                        {r.initials}
                      </span>
                      <div>
                        <p className="text-[12px] font-semibold text-ink">
                          {r.author} <span className="font-normal text-ink-4">· {r.time}</span>
                        </p>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-ink-2">{r.body}</p>
                      </div>
                    </div>
                  ))}

                  <div className="mt-2.5 flex items-center gap-2">
                    <input
                      placeholder="Reply…"
                      className="h-8 flex-1 rounded-md border border-line bg-surface px-2.5 text-[12px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none"
                    />
                    <Button
                      size="sm"
                      onClick={() => push({ title: "Thread resolved", body: "Comment threads are demo data in the prototype.", tone: "good" })}
                    >
                      Resolve
                    </Button>
                    <Button
                      size="sm"
                      icon={<MessageSquare size={13} />}
                      onClick={() => push({ title: "Assigned", body: "Wire this to your notifications provider.", tone: "info" })}
                    >
                      Assign
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {editing ? <EditDrawer open monthKey={editing} onClose={() => setEditing(null)} /> : null}

      <Drawer
        open={prefsOpen}
        onClose={() => setPrefsOpen(false)}
        title="Calculation rules"
        subtitle="Which orders and costs enter the statement"
        width="min(620px, 96vw)"
      >
        <CalculationPreferences onClose={() => setPrefsOpen(false)} />
      </Drawer>
    </PageShell>
  );
}
