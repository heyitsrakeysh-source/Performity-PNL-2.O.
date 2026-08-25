"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1.5 flex items-center gap-2">{eyebrow}</div> : null}
        <h1 className="text-[26px] leading-[1.15] font-bold tracking-[-0.028em] text-ink sm:text-[30px]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-ink-3">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[1560px] px-4 py-6 sm:px-6 sm:py-7", className)}>{children}</div>
  );
}
