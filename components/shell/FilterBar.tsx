"use client";

/**
 * One filter row, above everything it scopes. Charts never carry their own
 * data filters: they all re-render against this single slice, and the previous
 * render is held at reduced opacity while a change settles rather than
 * flashing a skeleton.
 */

import { Download, Lightbulb, Upload } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { CHANNELS } from "@/lib/data/workspace";

import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { DateRangePicker } from "./DateRangePicker";
import { useToast } from "./Toast";
import { cn } from "@/lib/cn";

export function FilterBar({
  right,
  showActions = true,
  className,
}: {
  right?: React.ReactNode;
  showActions?: boolean;
  className?: string;
}) {
  const { channel, setChannel } = useWorkspace();
  const { push } = useToast();

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2.5 rounded-lg border border-line bg-surface p-2.5 shadow-xs",
        className,
      )}
    >
      <DateRangePicker className="w-[300px]" />

      <Select
        ariaLabel="Channel"
        value={channel}
        onChange={setChannel}
        options={CHANNELS.map((c) => ({ value: c.id, label: c.label }))}
        className="w-[148px]"
      />

      <div className="ml-auto flex items-center gap-2">
        {right}
        {showActions ? (
          <>
            <Button
              size="sm"
              icon={<Download size={14} />}
              onClick={() =>
                push({
                  title: "Export queued",
                  body: "CSV and XLSX exports are demo actions in the prototype.",
                  tone: "info",
                })
              }
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
              onClick={() =>
                push({
                  title: "Upload data",
                  body: "Connect your import endpoint. See Guide & setup.",
                  tone: "info",
                })
              }
            >
              Upload data
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
