"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

/**
 * Segmented control with a pill that physically slides between options,
 * measured from the DOM so it stays correct at any label width.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
  ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => {
      const active = wrap.querySelector<HTMLElement>("[data-active='true']");
      if (!active) return;
      setPill({ left: active.offsetLeft, width: active.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [value, options]);

  return (
    <div
      ref={wrapRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "relative inline-flex items-center rounded-lg border border-line bg-surface-2 p-0.5",
        className,
      )}
    >
      {pill ? (
        <span
          aria-hidden
          className="absolute top-0.5 bottom-0.5 rounded-[7px] bg-surface shadow-xs ring-1 ring-black/[0.03] transition-[left,width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ left: pill.left, width: pill.width }}
        />
      ) : null}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            data-active={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative z-10 inline-flex items-center gap-1.5 whitespace-nowrap rounded-[7px] font-medium transition-colors duration-200",
              size === "sm" ? "h-7 px-2.5 text-[12px]" : "h-8 px-3 text-[12.5px]",
              active ? "text-ink" : "text-ink-3 hover:text-ink-2",
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
