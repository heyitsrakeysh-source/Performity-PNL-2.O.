"use client";

import { ArrowRight, X } from "lucide-react";
import { useState } from "react";
import { useWorkspace } from "@/lib/store";
import { ProgressRing } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function CompletenessStrip({ onReview, className }: { onReview?: () => void; className?: string }) {
  const { completeness } = useWorkspace();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || completeness.missing === 0) {
    return completeness.missing === 0 && !dismissed ? (
      <div className={cn("flex items-center gap-3 rounded-lg border border-line bg-good-soft px-4 py-3", className)}>
        <ProgressRing value={100} size={32} stroke={3.5} tone="good" />
        <p className="text-[13px] font-medium text-good-ink">
          Every input for this month is in. Net profit is fully reconciled.
        </p>
      </div>
    ) : null;
  }

  const tone = completeness.pct >= 90 ? "good" : completeness.pct >= 70 ? "brand" : "warning";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-line bg-surface px-4 py-3 shadow-xs",
        className,
      )}
    >
      <ProgressRing value={completeness.pct} size={38} stroke={4} tone={tone}>
        {Math.round(completeness.pct)}
      </ProgressRing>

      <div className="min-w-[220px] flex-1">
        <p className="text-[13px] font-semibold text-ink">
          Data {completeness.pct.toFixed(0)}% complete, {completeness.missing} input
          {completeness.missing === 1 ? "" : "s"} missing
        </p>
        <p className="mt-0.5 text-[12px] text-ink-3">
          {completeness.missingFields
            .slice(0, 3)
            .map((f) => f.label)
            .join(", ")}
          {completeness.missing > 3 ? ` and ${completeness.missing - 3} more` : ""}, accuracy of the net profit line
          depends on these.
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" variant="primary" onClick={onReview} iconRight={<ArrowRight size={14} />} href={onReview ? undefined : "/statement"}>
          Review inputs
        </Button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="grid size-7 place-items-center rounded-md text-ink-4 transition-colors hover:bg-surface-3 hover:text-ink"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
