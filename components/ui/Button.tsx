"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand text-white shadow-xs hover:bg-brand-hover active:bg-brand-press border border-transparent",
  secondary:
    "bg-surface text-ink border border-line shadow-xs hover:border-line-strong hover:bg-surface-2 active:bg-surface-3",
  ghost: "text-ink-2 hover:bg-surface-3 hover:text-ink border border-transparent",
  subtle: "bg-brand-soft text-brand-ink border border-transparent hover:bg-brand-soft-2",
  danger: "bg-critical text-white border border-transparent hover:brightness-95",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-2.5 text-[12.5px] gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-[13px] gap-2 rounded-md",
  lg: "h-11 px-5 text-[14px] gap-2 rounded-lg",
};

const BASE =
  "inline-flex select-none items-center justify-center font-medium whitespace-nowrap " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 " +
  "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
  href?: string;
}

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconRight,
  className,
  children,
  href,
  ...rest
}: Props) {
  const classes = cn(BASE, VARIANTS[variant], SIZES[size], className);
  const inner = (
    <>
      {icon}
      {children}
      {iconRight}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={classes}>
        {inner}
      </Link>
    );
  }
  return (
    <button className={classes} {...rest}>
      {inner}
    </button>
  );
}

export function IconButton({
  label,
  children,
  className,
  active,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        "grid size-8 place-items-center rounded-md border border-transparent text-ink-3",
        "transition-[background-color,color,border-color] duration-150",
        "hover:bg-surface-3 hover:text-ink active:scale-95",
        active && "border-line bg-surface-3 text-brand",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
