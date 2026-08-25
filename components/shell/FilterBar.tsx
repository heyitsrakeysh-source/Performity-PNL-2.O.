"use client";

/**
 * One filter row, above everything it scopes. Charts never carry their own
 * data filters — they all re-render against this single slice, and the
 * previous render is held at reduced opacity while a change settles rather
 * than flashing a skeleton.
 */

import { Calendar, Download, Lightbulb, Upload } from "lucide-react";
import { useWorkspace, type Period } from "@/lib/store";
import { CHANNELS } from "@/lib/data/workspace";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useToast } from "./Toast";
import { cn } from "@/lib/cn";

const PERIODS: { value: Period; label: string }[] = [
  { value: "3M", label: "3M" },
  { value: "6M", label: "6M" },
  { value: "12M", label: "12M" },
  { value: "YTD", label: "YTD" },
];

export function FilterBar({
  right,
  showActions = true,
  className,
}: {
  right?: React.ReactNode;
  showActions?: boolean;
  className?: string;
}) {
  const { period, setPeriod, channel, setChannel, visibleMonths } = useWorkspace();
  const { push } = useToast();

  const from = visibleMonths[0];
  const to = visibleMonths[visibleMonths.length - 1];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2.5 rounded-lg border border-line bg-surface p-2.5 shadow-xs",
        className,
      )}
    >
      <Segmented options={PERIODS} value={period} onChange={setPeriod} ariaLabel="Time range" />

      <Select
        ariaLabel="Channel"
        value={channel}
        onChange={setChannel}
        options={CHANNELS.map((c) => ({ value: c.id, label: c.label }))}
        className="w-[150px]"
      />

      <span className="flex h-9 items-center gap-2 rounded-md border border-line bg-surface-2 px-3 text-[12.5px] font-medium text-ink-2">
        <Calendar size={14} className="text-ink-4" />
        {from?.label} — {to?.label}
      </span>

      <div className="ml-auto flex items-center gap-2">
        {right}
        {showActions ? (
          <>
            <Button
              size="sm"
              icon={<Download size={14} />}
              onClick={() => push({ title: "Export queued", body: "CSV and XLSX exports are demo actions in the prototype.", tone: "info" })}
            >
              Export
            </Button>
            <Button size="sm" icon={<Lightbulb size={14} />} href="/story">
              Insights
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={<Upload size={14} />}
              onClick={() => push({ title: "Upload data", body: "Connect your import endpoint — see Guide & setup.", tone: "info" })}
            >
              Upload data
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
