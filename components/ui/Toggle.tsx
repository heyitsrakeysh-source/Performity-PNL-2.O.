"use client";

import { cn } from "@/lib/cn";

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  size = "md",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const w = size === "sm" ? "w-8" : "w-9";
  const h = size === "sm" ? "h-[18px]" : "h-5";
  const knob = size === "sm" ? "size-3.5" : "size-4";
  const shift = size === "sm" ? "translate-x-[14px]" : "translate-x-4";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 disabled:opacity-40",
        w,
        h,
        checked ? "bg-brand" : "bg-line-strong",
      )}
    >
      <span
        className={cn(
          "rounded-full bg-white shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
          knob,
          checked ? shift : "translate-x-0",
        )}
      />
    </button>
  );
}
