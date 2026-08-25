"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "./Button";

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  headerExtra,
  width = "min(760px, 92vw)",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  headerExtra?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end" role="dialog" aria-modal="true">
      <button
        aria-label="Close panel"
        onClick={onClose}
        className="anim-fade-in absolute inset-0 cursor-default backdrop-blur-[2px]"
        style={{ background: "var(--overlay)" }}
      />
      <aside
        className="anim-slide-in-right relative flex h-full flex-col border-l border-line bg-surface shadow-lg"
        style={{ width }}
      >
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-semibold tracking-[-0.015em] text-ink">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-[12.5px] text-ink-3">{subtitle}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {headerExtra}
            <IconButton label="Close" onClick={onClose}>
              <X size={16} />
            </IconButton>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

        {footer ? (
          <footer className="border-t border-line bg-surface-2 px-5 py-3.5">{footer}</footer>
        ) : null}
      </aside>
    </div>
  );
}
