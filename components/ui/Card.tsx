import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({
  children,
  className,
  interactive = false,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        "relative rounded-lg border border-line bg-surface shadow-xs",
        "transition-[box-shadow,border-color,transform] duration-200",
        interactive &&
          "hover:-translate-y-px hover:border-line-strong hover:shadow-md focus-within:border-line-strong",
        padded && "p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
  info,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  info?: string;
}) {
  return (
    <header className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="flex items-center gap-1.5 text-[15px] font-semibold tracking-[-0.01em] text-ink">
          {title}
          {info ? <InfoDot text={info} /> : null}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-[12.5px] leading-snug text-ink-3">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </header>
  );
}

export function InfoDot({ text }: { text: string }) {
  return (
    <span className="group/info relative inline-flex">
      <span
        aria-hidden
        className="grid size-[15px] cursor-help place-items-center rounded-full border border-line-strong text-[9px] font-bold text-ink-4 transition-colors group-hover/info:border-brand group-hover/info:text-brand"
      >
        i
      </span>
      <span className="sr-only">{text}</span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 translate-y-1 rounded-md border border-line bg-surface p-2.5 text-[11.5px] font-normal leading-relaxed text-ink-2 opacity-0 shadow-pop transition-[opacity,transform] duration-150 group-hover/info:translate-y-0 group-hover/info:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
