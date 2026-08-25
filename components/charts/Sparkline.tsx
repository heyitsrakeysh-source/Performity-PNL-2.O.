"use client";

import { useMeasure, smoothPath, linearScale } from "./primitives";
import { cn } from "@/lib/cn";

/**
 * A trend shape, not a chart: no axes, no labels, one series. The tile's
 * headline number carries the value; this carries the direction.
 */
export function Sparkline({
  values,
  height = 34,
  color = "var(--brand)",
  fill = true,
  showEnd = true,
  className,
  strokeWidth = 1.75,
}: {
  values: number[];
  height?: number;
  color?: string;
  fill?: boolean;
  showEnd?: boolean;
  className?: string;
  strokeWidth?: number;
}) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const pad = 3;

  let body: React.ReactNode = null;

  if (width > 0 && values.length > 1) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const y = linearScale([min, max], [height - pad, pad]);
    const stepX = (width - pad * 2) / (values.length - 1);
    const pts = values.map((v, i) => [pad + i * stepX, y(v)] as [number, number]);
    const d = smoothPath(pts, 0.3);
    const area = `${d}L${pts[pts.length - 1][0]},${height}L${pts[0][0]},${height}Z`;
    const gid = `spark-${color.replace(/[^a-z0-9]/gi, "")}-${values.length}`;
    const last = pts[pts.length - 1];

    body = (
      <svg width={width} height={height} aria-hidden className="overflow-visible">
        {fill ? (
          <>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={area} fill={`url(#${gid})`} />
          </>
        ) : null}
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {showEnd ? (
          <>
            <circle cx={last[0]} cy={last[1]} r={3.6} fill="var(--surface)" />
            <circle cx={last[0]} cy={last[1]} r={2.4} fill={color} />
          </>
        ) : null}
      </svg>
    );
  }

  return (
    <div ref={ref} className={cn("w-full", className)} style={{ height }}>
      {body}
    </div>
  );
}
