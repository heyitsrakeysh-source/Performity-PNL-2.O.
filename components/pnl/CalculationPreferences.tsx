"use client";

/**
 * Calculation preferences — which orders count toward the statement.
 * Carried over from the original tool, restructured so each switch states
 * its consequence rather than only its name.
 */

import { useState } from "react";
import { ArrowLeft, Info, RotateCcw } from "lucide-react";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/shell/Toast";
import { cn } from "@/lib/cn";

interface Pref {
  id: string;
  label: string;
  body: string;
  defaultOn: boolean;
  impact?: string;
}

const PREFS: { group: string; items: Pref[] }[] = [
  {
    group: "Order inclusion",
    items: [
      {
        id: "unfulfilled",
        label: "Exclude unfulfilled orders",
        body: "Filters out unpaid, COD-pending and payment-pending orders. Only completed payments reach the amounts shown.",
        defaultOn: true,
        impact: "Currently removing 194 orders worth ₹3.58L",
      },
      {
        id: "partial",
        label: "Include partially paid orders",
        body: "Counts orders where the payment status is Partially Paid, at the amount collected so far.",
        defaultOn: false,
      },
      {
        id: "cancelled",
        label: "Exclude cancelled orders",
        body: "Orders cancelled after placement are removed from both revenue and COGS.",
        defaultOn: true,
        impact: "Currently removing 61 orders",
      },
      {
        id: "free",
        label: "Exclude ₹0 orders",
        body: "Fully discounted or gifted orders that bring no revenue but still carry fulfilment cost.",
        defaultOn: false,
      },
      {
        id: "draft",
        label: "Exclude draft orders",
        body: "Orders created as drafts are removed from net sales and COGS calculations.",
        defaultOn: false,
      },
    ],
  },
  {
    group: "Cost sourcing",
    items: [
      {
        id: "sync_cogs",
        label: "Sync COGS from Shopify",
        body: "Pull product cost from Shopify instead of the cost sheet. Only GST-related fields then need filling manually.",
        defaultOn: false,
      },
      {
        id: "allocate_fixed",
        label: "Allocate fixed cost per order",
        body: "Spread standing overhead across orders so contribution per order is shown net of overhead.",
        defaultOn: true,
        impact: "₹166 per order this month",
      },
      {
        id: "accrual",
        label: "Accrual basis",
        body: "Recognise revenue and cost in the period they were earned or incurred, not when cash moved.",
        defaultOn: true,
      },
    ],
  },
  {
    group: "Filters",
    items: [
      {
        id: "tags",
        label: "Exclude tagged orders",
        body: "Any order carrying an excluded tag is left out of every calculation.",
        defaultOn: false,
      },
      {
        id: "test",
        label: "Exclude test orders",
        body: "Orders created by the Shopify Bogus Gateway or flagged internally as tests.",
        defaultOn: true,
      },
    ],
  },
];

export function CalculationPreferences({ onClose }: { onClose: () => void }) {
  const { push } = useToast();
  const [state, setState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PREFS.flatMap((g) => g.items.map((i) => [i.id, i.defaultOn]))),
  );

  const changed = PREFS.flatMap((g) => g.items).filter((i) => state[i.id] !== i.defaultOn).length;

  return (
    <div className="anim-fade-in">
      <div className="flex items-center gap-2 border-b border-line px-5 py-3">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:text-ink"
        >
          <ArrowLeft size={14} />
          Back to inputs
        </button>
        {changed > 0 ? (
          <span className="ml-auto text-[11.5px] font-medium text-brand-ink">{changed} changed</span>
        ) : null}
      </div>

      <div className="p-5">
        <h3 className="text-[15px] font-semibold text-ink">Calculation preferences</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
          These decide which orders and costs enter the statement. Changes apply to every current and future
          calculation, and are reflected immediately across reports and analytics.
        </p>

        <div className="mt-5 space-y-5">
          {PREFS.map((group) => (
            <section key={group.group}>
              <p className="label-xs mb-2">{group.group}</p>
              <div className="overflow-hidden rounded-lg border border-line">
                {group.items.map((p, i) => (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-start gap-4 px-4 py-3.5 transition-colors hover:bg-surface-2",
                      i > 0 && "border-t border-line-soft",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-ink">{p.label}</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{p.body}</p>
                      {p.impact && state[p.id] ? (
                        <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-brand-soft px-2 py-1 text-[11px] font-medium text-brand-ink">
                          <Info size={11} />
                          {p.impact}
                        </p>
                      ) : null}
                    </div>
                    <Toggle
                      checked={state[p.id]}
                      onChange={(v) => setState((s) => ({ ...s, [p.id]: v }))}
                      label={p.label}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-line bg-brand-soft px-4 py-3">
          <Info size={15} className="mt-px shrink-0 text-brand-ink" />
          <p className="text-[12px] leading-relaxed text-brand-ink">
            <strong>These settings apply to all current and future calculations.</strong> In production they belong
            on the workspace record so every member of the team sees the same numbers.
          </p>
        </div>

        <Button
          className="mt-3 w-full"
          icon={<RotateCcw size={14} />}
          onClick={() => {
            setState(Object.fromEntries(PREFS.flatMap((g) => g.items.map((i) => [i.id, i.defaultOn]))));
            push({ title: "Preferences reset to defaults", tone: "info" });
          }}
        >
          Reset to default settings
        </Button>
      </div>
    </div>
  );
}
