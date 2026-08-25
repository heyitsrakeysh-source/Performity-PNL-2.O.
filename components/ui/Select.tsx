"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export function Select({
  value,
  options,
  onChange,
  className,
  ariaLabel,
  size = "md",
}: {
  value: string;
  options: { value: string; label: string; hint?: string }[];
  onChange: (v: string) => void;
  className?: string;
  ariaLabel: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex w-full items-center justify-between gap-2 rounded-md border border-line bg-surface font-medium text-ink shadow-xs transition-colors hover:border-line-strong",
          size === "sm" ? "h-8 px-2.5 text-[12.5px]" : "h-9 px-3 text-[13px]",
        )}
      >
        <span className="truncate">{active?.label ?? value}</span>
        <ChevronDown
          size={14}
          className={cn("shrink-0 text-ink-4 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          className="anim-scale-in absolute right-0 z-50 mt-1.5 max-h-72 w-max min-w-full origin-top overflow-auto rounded-lg border border-line bg-surface p-1 shadow-pop"
        >
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <li key={o.value}>
                <button
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-6 rounded-[6px] px-2.5 py-1.5 text-left text-[13px] transition-colors",
                    selected ? "bg-brand-soft text-brand-ink" : "text-ink-2 hover:bg-surface-3 hover:text-ink",
                  )}
                >
                  <span className="flex flex-col">
                    <span className="font-medium">{o.label}</span>
                    {o.hint ? <span className="text-[11px] text-ink-4">{o.hint}</span> : null}
                  </span>
                  {selected ? <Check size={14} strokeWidth={2.5} /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
