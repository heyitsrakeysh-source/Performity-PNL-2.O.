"use client";

import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

/* --------------------------------------------------------------- chips --- */

export function Chip({
  children,
  tone = "neutral",
  className,
  icon,
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "good" | "warning" | "critical";
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-semibold",
        tone === "neutral" && "bg-surface-3 text-ink-2",
        tone === "brand" && "bg-brand-soft text-brand-ink",
        tone === "good" && "bg-good-soft text-good-ink",
        tone === "warning" && "bg-warning-soft text-warning-ink",
        tone === "critical" && "bg-critical-soft text-critical-ink",
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/* -------------------------------------------------------- status badge --- */

/**
 * Status always ships as icon + label. Colour alone never carries the state,
 * because the warning amber is the same hue family as a chart series.
 */
export function StatusBadge({
  status,
  label,
  className,
}: {
  status: "good" | "warning" | "serious" | "critical" | "info";
  label: string;
  className?: string;
}) {
  const Icon =
    status === "good" ? CheckCircle2 : status === "info" ? Info : status === "critical" ? XCircle : AlertTriangle;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11.5px] font-semibold",
        status === "good" && "bg-good-soft text-good-ink",
        status === "warning" && "bg-warning-soft text-warning-ink",
        status === "serious" && "bg-serious-soft text-serious-ink",
        status === "critical" && "bg-critical-soft text-critical-ink",
        status === "info" && "bg-brand-soft text-brand-ink",
        className,
      )}
    >
      <Icon size={12.5} strokeWidth={2.4} aria-hidden />
      {label}
    </span>
  );
}

/* -------------------------------------------------------- progress ring -- */

export function ProgressRing({
  value,
  size = 40,
  stroke = 4,
  className,
  children,
  tone = "brand",
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  children?: ReactNode;
  tone?: "brand" | "good" | "warning";
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const color = tone === "good" ? "var(--good)" : tone === "warning" ? "var(--warning)" : "var(--brand)";

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 grid place-items-center text-[10.5px] font-bold tabular-nums text-ink">
          {children}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------ progress --- */

export function ProgressBar({
  value,
  tone = "brand",
  className,
  height = 6,
}: {
  value: number;
  tone?: "brand" | "good" | "warning" | "critical";
  className?: string;
  height?: number;
}) {
  const color =
    tone === "good" ? "var(--good)" : tone === "warning" ? "var(--warning)" : tone === "critical" ? "var(--critical)" : "var(--brand)";
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-surface-3", className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          background: color,
          transition: "width 700ms cubic-bezier(0.16,1,0.3,1)",
        }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- misc --- */

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-line bg-surface-2 px-1 font-sans text-[10.5px] font-semibold text-ink-3">
      {children}
    </kbd>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}
