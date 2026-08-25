"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CornerDownLeft,
  Download,
  FileBarChart2,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import { ALL_NAV_ITEMS } from "@/lib/nav";
import { MONTHS } from "@/lib/data/model";
import { SAVED_VIEWS } from "@/lib/data/workspace";
import { SKU_ROWS } from "@/lib/data/skus";
import { money } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Kbd } from "@/components/ui/Bits";
import { useToast } from "./Toast";

interface Command {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon?: React.ReactNode;
  run: () => void;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { push } = useToast();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const commands: Command[] = useMemo(() => {
    const nav: Command[] = ALL_NAV_ITEMS.filter((i) => !i.soon).map((i) => ({
      id: `nav-${i.href}`,
      label: i.label,
      hint: i.hint,
      group: "Navigate",
      icon: <i.icon size={15} />,
      run: () => router.push(i.href),
    }));

    const views: Command[] = SAVED_VIEWS.map((v) => ({
      id: `view-${v.id}`,
      label: v.name,
      hint: v.description,
      group: "Saved views",
      icon: <Sparkles size={15} />,
      run: () => {
        router.push("/explorer");
        push({ title: `Applied “${v.name}”`, body: v.description, tone: "info" });
      },
    }));

    const months: Command[] = MONTHS.slice(-6)
      .reverse()
      .map((m) => ({
        id: `month-${m.key}`,
        label: m.label,
        hint: `Net profit ${money(m.netProfit)} · margin ${m.netMarginPct.toFixed(1)}%`,
        group: "Months",
        icon: <FileBarChart2 size={15} />,
        run: () => {
          router.push("/statement");
          push({ title: `Jumped to ${m.label}`, tone: "info" });
        },
      }));

    const skus: Command[] = SKU_ROWS.filter((s) => !s.isLongTail)
      .slice(0, 8)
      .map((s) => ({
        id: `sku-${s.id}`,
        label: s.name,
        hint: `${money(s.contributionPerOrder)} contribution / order`,
        group: "SKUs",
        icon: <Search size={15} />,
        run: () => {
          router.push("/unit-economics");
          push({ title: s.name, body: `Contribution ${money(s.contributionPerOrder)} per order`, tone: "info" });
        },
      }));

    const actions: Command[] = [
      {
        id: "act-upload",
        label: "Upload data",
        hint: "Import a cost sheet",
        group: "Actions",
        icon: <Upload size={15} />,
        run: () => push({ title: "Upload is a demo action", body: "Point this at your import endpoint — see Guide & setup.", tone: "info" }),
      },
      {
        id: "act-export",
        label: "Export board PDF",
        hint: "Print-ready monthly pack",
        group: "Actions",
        icon: <Download size={15} />,
        run: () => router.push("/reports"),
      },
    ];

    return [...nav, ...views, ...months, ...skus, ...actions];
  }, [router, push]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.filter((c) => c.group === "Navigate" || c.group === "Actions");
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || c.hint?.toLowerCase().includes(q) || c.group.toLowerCase().includes(q),
    );
  }, [commands, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const c of results) {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group)!.push(c);
    }
    return [...map.entries()];
  }, [results]);

  const flat = grouped.flatMap(([, items]) => items);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(flat.length - 1, c + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(0, c - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = flat[cursor];
        if (cmd) {
          cmd.run();
          onClose();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, flat, cursor, onClose]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>("[data-cursor='true']")?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  if (!open) return null;

  let index = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[10vh]" role="dialog" aria-modal="true" aria-label="Command palette">
      <button aria-label="Close" onClick={onClose} className="anim-fade-in absolute inset-0 cursor-default backdrop-blur-[3px]" style={{ background: "var(--overlay)" }} />

      <div className="anim-scale-in relative w-full max-w-[620px] overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Search size={17} className="shrink-0 text-ink-4" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search metrics, SKUs, months, views…"
            className="h-13 w-full bg-transparent py-4 text-[14px] text-ink placeholder:text-ink-4 focus:outline-none"
          />
          <Kbd>esc</Kbd>
        </div>

        <ul ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          {grouped.length === 0 ? (
            <li className="px-3 py-10 text-center text-[13px] text-ink-3">
              No matches for “{query}”
            </li>
          ) : null}
          {grouped.map(([group, items]) => (
            <li key={group} className="mb-1">
              <p className="label-xs px-2.5 py-1.5 text-[10px]">{group}</p>
              <ul>
                {items.map((c) => {
                  index += 1;
                  const active = index === cursor;
                  const myIndex = index;
                  return (
                    <li key={c.id}>
                      <button
                        data-cursor={active}
                        onMouseEnter={() => setCursor(myIndex)}
                        onClick={() => {
                          c.run();
                          onClose();
                        }}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                          active ? "bg-brand-soft text-brand-ink" : "text-ink-2 hover:bg-surface-2",
                        )}
                      >
                        <span className={cn("shrink-0", active ? "text-brand" : "text-ink-4")}>{c.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-ink">{c.label}</span>
                          {c.hint ? <span className="block truncate text-[11.5px] text-ink-4">{c.hint}</span> : null}
                        </span>
                        {active ? <CornerDownLeft size={13} className="shrink-0 text-brand" /> : <ArrowRight size={13} className="shrink-0 text-ink-4 opacity-0" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4 border-t border-line bg-surface-2 px-4 py-2.5 text-[11px] text-ink-4">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd> select
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>esc</Kbd> close
          </span>
          <span className="ml-auto">{flat.length} result{flat.length === 1 ? "" : "s"}</span>
        </div>
      </div>
    </div>
  );
}
