"use client";

import type { MonthFigures } from "@/lib/data/model";
import { money, pct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { perOrderBreakdown } from "@/lib/data/derived";
import { seriesVar } from "@/lib/data/model";
import { useMeasure } from "./primitives";

/* ============================================================================
 * PER-ORDER BAR — where one order's rupee goes
 * ==========================================================================*/

export function PerOrderBar({ month, height = 34 }: { month: MonthFigures; height?: number }) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const b = perOrderBreakdown(month);
  const positive = b.contribution >= 0;
  const total = b.parts.reduce((s, p) => s + p.value, 0) + Math.max(b.contribution, 0);
  const scale = width / Math.max(total, b.aov);
  const GAP = 2;

  const segments = [
    ...b.parts.map((p) => ({ id: p.id, label: p.label, value: p.value, color: seriesVar(p.slot), share: p.share })),
    ...(positive
      ? [{ id: "contribution", label: "Contribution", value: b.contribution, color: "var(--good)", share: b.contributionShare }]
      : []),
  ];

  return (
    <div>
      <div ref={ref} className="relative w-full" style={{ height }}>
        {width > 0 ? (
          <svg width={width} height={height} role="img" aria-label="Breakdown of an average order's rupee">
            {(() => {
              let x = 0;
              return segments.map((s, i) => {
                const w = Math.max(0, s.value * scale - GAP);
                const node = (
                  <g key={s.id}>
                    <rect
                      x={x}
                      y={0}
                      width={w}
                      height={height}
                      rx={i === 0 || i === segments.length - 1 ? 4 : 2}
                      fill={s.color}
                      className="grow-x"
                      style={{ transformOrigin: "left center", animationDelay: `${i * 50}ms` }}
                    />
                    {w > 44 ? (
                      <text
                        x={x + w / 2}
                        y={height / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={11}
                        fontWeight={700}
                        fill="#fff"
                        className="tnum pointer-events-none"
                      >
                        {money(s.value)}
                      </text>
                    ) : null}
                    <title>{`${s.label}: ${money(s.value)} (${pct(s.share)})`}</title>
                  </g>
                );
                x += s.value * scale;
                return node;
              });
            })()}
          </svg>
        ) : null}
      </div>

      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <li key={s.id} className="flex items-center gap-1.5 text-[11.5px]">
            <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} aria-hidden />
            <span className="text-ink-2">{s.label}</span>
            <span className="tnum font-semibold text-ink">{money(s.value)}</span>
            <span className="tnum text-ink-4">{pct(s.share)}</span>
          </li>
        ))}
        {!positive ? (
          <li className="flex items-center gap-1.5 text-[11.5px]">
            <span className="size-2.5 rounded-[3px] bg-critical" aria-hidden />
            <span className="font-semibold text-critical-ink">Shortfall {money(b.contribution)}</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

/* ============================================================================
 * BULLET — you against a peer median
 * ==========================================================================*/

export function BulletRow({
  label,
  you,
  peer,
  higherIsBetter,
  format,
  max,
}: {
  label: string;
  you: number;
  peer: number;
  higherIsBetter: boolean;
  format: (v: number) => string;
  max: number;
}) {
  const youPct = Math.min(100, (you / max) * 100);
  const peerPct = Math.min(100, (peer / max) * 100);
  const winning = higherIsBetter ? you >= peer : you <= peer;

  return (
    <div className="py-2">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[12.5px] font-medium text-ink-2">{label}</span>
        <span className="flex items-baseline gap-2">
          <span className={cn("tnum text-[13px] font-bold", winning ? "text-good-ink" : "text-critical-ink")}>
            {format(you)}
          </span>
          <span className="tnum text-[11.5px] text-ink-4">peer {format(peer)}</span>
        </span>
      </div>
      <div className="relative h-2.5 w-full rounded-full bg-surface-3">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${youPct}%`,
            background: winning ? "var(--good)" : "var(--critical)",
            transition: "width 700ms cubic-bezier(0.16,1,0.3,1)",
          }}
        />
        <div
          className="absolute inset-y-[-3px] w-0.5 rounded-full bg-ink"
          style={{ left: `${peerPct}%` }}
          title={`Peer median ${format(peer)}`}
        />
      </div>
    </div>
  );
}

/* ============================================================================
 * MARGIN GAUGE — margin against the break-even point
 * ==========================================================================*/

export function MarginGauge({
  value,
  min,
  max,
  target,
  size = 116,
  label,
}: {
  value: number;
  min: number;
  max: number;
  target: number;
  size?: number;
  label?: string;
}) {
  const h = size * 0.62;
  const cx = size / 2;
  const cy = h - 6;
  const r = size / 2 - 10;
  const START = Math.PI;
  const END = 0;

  const angle = (v: number) => {
    const t = Math.max(0, Math.min(1, (v - min) / (max - min || 1)));
    return START + t * (END - START);
  };
  const point = (a: number, rad: number) => [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad] as const;

  const arc = (from: number, to: number, rad: number) => {
    const [x0, y0] = point(from, rad);
    const [x1, y1] = point(to, rad);
    const large = Math.abs(to - from) > Math.PI ? 1 : 0;
    return `M${x0},${y0}A${rad},${rad} 0 ${large} 1 ${x1},${y1}`;
  };

  const positive = value >= 0;
  const [tx, ty] = point(angle(target), r);
  const [tx2, ty2] = point(angle(target), r - 9);

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={h + 4} role="img" aria-label={`${label ?? "Value"}: ${value.toFixed(2)}`}>
        <path d={arc(START, END, r)} fill="none" stroke="var(--surface-3)" strokeWidth={9} strokeLinecap="round" />
        <path
          d={arc(START, angle(value), r)}
          fill="none"
          stroke={positive ? "var(--good)" : "var(--critical)"}
          strokeWidth={9}
          strokeLinecap="round"
          className="draw-in"
          style={{ ["--len" as string]: "300" }}
        />
        <line x1={tx} y1={ty} x2={tx2} y2={ty2} stroke="var(--ink)" strokeWidth={2} strokeLinecap="round" />
      </svg>
      <div className="-mt-5 text-center">
        <p className={cn("figure-lg text-[20px]", positive ? "text-good-ink" : "text-critical-ink")}>
          {value.toFixed(2)}%
        </p>
        {label ? <p className="mt-0.5 text-[10.5px] text-ink-4">{label}</p> : null}
      </div>
    </div>
  );
}

/* ============================================================================
 * BREAK-EVEN TRACK
 * ==========================================================================*/

export function BreakEvenTrack({ month }: { month: MonthFigures }) {
  const be = month.breakEvenRoas;
  const cur = month.roas;
  // With break-even and current often within a rounding error of each other,
  // the domain is anchored on their midpoint so both flags stay separable.
  const mid = (be + cur) / 2;
  // Zoomed to the decision zone: the two figures are often within a rounding
  // error, and a wide domain would put both flags on the same pixel.
  const spread = Math.max(Math.abs(be - cur) * 2.6, mid * 0.035);
  const lo = mid - spread;
  const hi = mid + spread;
  const posOf = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const meeting = cur >= be;

  return (
    <div>
      <div className="relative mt-11 mb-10 h-3 w-full rounded-full bg-surface-3">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${posOf(cur)}%`,
            background: meeting ? "var(--good)" : "var(--brand)",
            transition: "width 700ms cubic-bezier(0.16,1,0.3,1)",
          }}
        />
        <div
          className="absolute inset-y-0 rounded-full"
          style={{
            left: `${Math.min(posOf(cur), posOf(be))}%`,
            width: `${Math.abs(posOf(be) - posOf(cur))}%`,
            background: meeting ? "var(--good)" : "var(--critical)",
            opacity: meeting ? 1 : 0.35,
          }}
        />

        <Marker pos={posOf(cur)} label="Current" value={cur.toFixed(2)} tone={meeting ? "good" : "critical"} above />
        <Marker pos={posOf(be)} label="Break-even" value={be.toFixed(2)} tone="ink" />
      </div>
      <p className="text-[12px] text-ink-3">
        {meeting ? (
          <>
            Running <strong className="text-good-ink">{(cur - be).toFixed(2)} above</strong> break-even ROAS.
          </>
        ) : (
          <>
            Running <strong className="text-critical-ink">{(be - cur).toFixed(2)} below</strong> the ROAS this cost
            base needs. Closing the gap turns the month positive.
          </>
        )}
      </p>
    </div>
  );
}

function Marker({
  pos,
  label,
  value,
  tone,
  above,
}: {
  pos: number;
  label: string;
  value: string;
  tone: "good" | "critical" | "ink";
  above?: boolean;
}) {
  const color = tone === "good" ? "var(--good)" : tone === "critical" ? "var(--critical)" : "var(--ink)";
  return (
    <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${pos}%` }}>
      <span className="block h-5 w-0.5 rounded-full" style={{ background: color }} />
      <span
        className={cn(
          "absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center",
          above ? "bottom-[18px]" : "top-[18px]",
        )}
      >
        <span className="tnum block text-[12.5px] font-bold" style={{ color }}>
          {value}
        </span>
        <span className="block text-[10px] text-ink-4">{label}</span>
      </span>
    </div>
  );
}
