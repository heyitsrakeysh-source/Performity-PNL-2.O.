"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, Info, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ToastItem {
  id: number;
  title: string;
  body?: string;
  tone?: "good" | "info" | "warning";
}

const ToastContext = createContext<{ push: (t: Omit<ToastItem, "id">) => void } | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((t: Omit<ToastItem, "id">) => {
    const id = nextId++;
    setItems((prev) => [...prev, { ...t, id }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed right-5 bottom-5 z-[200] flex w-[340px] flex-col gap-2">
        {items.map((t) => (
          <Toast key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4200);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const Icon = item.tone === "warning" ? AlertTriangle : item.tone === "info" ? Info : CheckCircle2;

  return (
    <div className="anim-scale-in pointer-events-auto flex items-start gap-2.5 rounded-lg border border-line bg-surface p-3 shadow-pop">
      <Icon
        size={16}
        className={cn(
          "mt-px shrink-0",
          item.tone === "warning" ? "text-warning" : item.tone === "info" ? "text-brand" : "text-good",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-ink">{item.title}</p>
        {item.body ? <p className="mt-0.5 text-[12px] leading-snug text-ink-3">{item.body}</p> : null}
      </div>
      <button onClick={onDismiss} aria-label="Dismiss" className="shrink-0 text-ink-4 transition-colors hover:text-ink">
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
