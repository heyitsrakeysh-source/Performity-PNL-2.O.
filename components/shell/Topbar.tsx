"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  ChevronDown,
  CloudCheck,
  Command,
  LogOut,
  Menu,
  MessageSquare,
  Monitor,
  Moon,
  RefreshCw,
  Settings,
  Sun,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { CURRENT_USER, NOTIFICATIONS } from "@/lib/data/workspace";
import { BRAND_PROFILES, computeMonth, driversForBrand } from "@/lib/data/model";
import { useWorkspace } from "@/lib/store";
import { money, pct } from "@/lib/format";
import { useTheme, type ThemeChoice } from "./ThemeProvider";
import { useToast } from "./Toast";
import { IconButton } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Bits";

function useOutside<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return ref;
}

export function Topbar({
  onOpenPalette,
  onOpenMobileNav,
}: {
  onOpenPalette: () => void;
  onOpenMobileNav: () => void;
}) {
  const [menu, setMenu] = useState<"brand" | "bell" | "user" | null>(null);
  const [syncing, setSyncing] = useState(false);
  const { brand, brandId, setBrandId, months } = useWorkspace();
  const [seen, setSeen] = useState(false);
  const { push } = useToast();
  const { choice, resolved, setChoice } = useTheme();

  const wrapRef = useOutside<HTMLDivElement>(() => setMenu(null));
  const unread = seen ? 0 : NOTIFICATIONS.filter((n) => n.unread).length;

  const runSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      push({
        title: "Sync complete",
        body: `Shopify, Amazon and Meta reconciled for ${months[months.length - 1].label}.`,
        tone: "good",
      });
    }, 1600);
  };

  return (
    <header data-print-hide className="sticky top-0 z-40 flex h-[60px] items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur-xl sm:px-6">
      <button
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        className="grid size-8 shrink-0 place-items-center rounded-md text-ink-2 transition-colors hover:bg-surface-3 lg:hidden"
      >
        <Menu size={17} />
      </button>

      <div ref={wrapRef} className="flex min-w-0 flex-1 items-center gap-3">
        {/* --- brand switcher --- */}
        <div className="relative">
          <button
            onClick={() => setMenu(menu === "brand" ? null : "brand")}
            aria-haspopup="menu"
            aria-expanded={menu === "brand"}
            className="flex h-9 items-center gap-2 rounded-md border border-line bg-surface px-2 pr-2.5 text-left transition-colors hover:border-line-strong hover:bg-surface-2"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-[6px] bg-brand text-[10.5px] font-bold text-white">
              {brand.initials}
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate text-[13px] leading-tight font-semibold text-ink">{brand.name}</span>
              <span className="block truncate text-[10.5px] leading-tight text-ink-4">{brand.category}</span>
            </span>
            <ChevronDown size={14} className={cn("shrink-0 text-ink-4 transition-transform", menu === "brand" && "rotate-180")} />
          </button>

          {menu === "brand" ? (
            <div className="anim-scale-in absolute top-full left-0 z-50 mt-1.5 w-64 origin-top-left rounded-lg border border-line bg-surface p-1.5 shadow-pop">
              <p className="label-xs px-2 py-1.5">Workspaces</p>
              {BRAND_PROFILES.map((b) => {
                const latest = monthlySnapshot(b.id);
                return (
                  <button
                    key={b.id}
                    onClick={() => {
                      setMenu(null);
                      if (b.id !== brandId) {
                        setBrandId(b.id);
                        push({
                          title: `Switched to ${b.name}`,
                          body: b.headline,
                          tone: "info",
                        });
                      }
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors",
                      b.id === brandId ? "bg-brand-soft" : "hover:bg-surface-3",
                    )}
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-brand text-[11px] font-bold text-white">
                      {b.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">{b.name}</span>
                      <span className="block text-[11px] text-ink-4">
                        {b.category} · {money(latest.revenue)} revenue
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span
                        className={cn(
                          "tnum block text-[11.5px] font-bold",
                          latest.margin < 0 ? "text-critical-ink" : "text-good-ink",
                        )}
                      >
                        {pct(latest.margin, 1)}
                      </span>
                      {b.id === brandId ? <Check size={13} className="ml-auto text-brand" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* --- palette hint (desktop) --- */}
        <button
          onClick={onOpenPalette}
          className="hidden h-9 flex-1 items-center gap-2 rounded-md border border-line bg-surface-2 px-3 text-ink-4 transition-colors hover:border-line-strong hover:text-ink-3 md:flex lg:max-w-sm"
        >
          <Command size={14} />
          <span className="text-[12.5px]">Search metrics, SKUs, months…</span>
          <span className="ml-auto flex gap-0.5">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          {/* --- sync --- */}
          <button
            onClick={runSync}
            disabled={syncing}
            className={cn(
              "hidden h-9 items-center gap-2 rounded-md border border-line bg-surface px-3 text-[12.5px] font-medium transition-colors sm:flex",
              syncing ? "text-ink-3" : "text-ink-2 hover:border-line-strong hover:bg-surface-2",
            )}
          >
            {syncing ? (
              <RefreshCw size={14} className="anim-spin text-brand" />
            ) : (
              <CloudCheck size={15} className="text-good" />
            )}
            <span>{syncing ? "Syncing…" : "Synced 12m ago"}</span>
          </button>

          {/* --- theme --- */}
          <ThemeSwitch choice={choice} resolved={resolved} onChange={setChoice} />

          {/* --- notifications --- */}
          <div className="relative">
            <IconButton
              label="Notifications"
              onClick={() => {
                setMenu(menu === "bell" ? null : "bell");
                setSeen(true);
              }}
              active={menu === "bell"}
            >
              <Bell size={16} />
              {unread > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 grid size-[15px] place-items-center rounded-full bg-critical text-[9px] font-bold text-white ring-2 ring-surface">
                  {unread}
                </span>
              ) : null}
            </IconButton>

            {menu === "bell" ? (
              <div className="anim-scale-in absolute top-full right-0 z-50 mt-1.5 w-[340px] origin-top-right rounded-lg border border-line bg-surface shadow-pop">
                <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
                  <p className="text-[13px] font-semibold text-ink">Notifications</p>
                  <Link href="/forecast" onClick={() => setMenu(null)} className="text-[11.5px] font-medium text-brand-ink hover:underline">
                    View all alerts
                  </Link>
                </div>
                <ul className="max-h-[360px] overflow-y-auto p-1.5">
                  {NOTIFICATIONS.map((n) => {
                    const Icon = n.kind === "alert" ? TriangleAlert : n.kind === "comment" ? MessageSquare : CloudCheck;
                    return (
                      <li key={n.id}>
                        <div className="flex gap-2.5 rounded-md p-2.5 transition-colors hover:bg-surface-2">
                          <span
                            className={cn(
                              "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
                              n.kind === "alert" ? "bg-critical-soft text-critical-ink" : n.kind === "comment" ? "bg-brand-soft text-brand-ink" : "bg-good-soft text-good-ink",
                            )}
                          >
                            <Icon size={13.5} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12.5px] font-semibold text-ink">{n.title}</p>
                            <p className="mt-0.5 text-[11.5px] leading-snug text-ink-3">{n.body}</p>
                            <p className="mt-1 text-[10.5px] text-ink-4">{n.time}</p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>

          {/* --- user --- */}
          <div className="relative">
            <button
              onClick={() => setMenu(menu === "user" ? null : "user")}
              aria-haspopup="menu"
              className="flex h-9 items-center gap-2 rounded-md pl-1 pr-1.5 transition-colors hover:bg-surface-3"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--series-6)] to-[var(--brand)] text-[11px] font-bold text-white">
                {CURRENT_USER.initials}
              </span>
              <span className="hidden text-[13px] font-medium text-ink lg:block">{CURRENT_USER.name}</span>
              <ChevronDown size={14} className="hidden shrink-0 text-ink-4 lg:block" />
            </button>

            {menu === "user" ? (
              <div className="anim-scale-in absolute top-full right-0 z-50 mt-1.5 w-60 origin-top-right rounded-lg border border-line bg-surface p-1.5 shadow-pop">
                <div className="border-b border-line px-2.5 pb-2.5 pt-1.5">
                  <p className="text-[13px] font-semibold text-ink">{CURRENT_USER.name}</p>
                  <p className="text-[11.5px] text-ink-4">{CURRENT_USER.email}</p>
                </div>
                <div className="pt-1.5">
                  {[
                    { icon: UserRound, label: "Profile" },
                    { icon: Settings, label: "Workspace settings" },
                    { icon: LogOut, label: "Sign out" },
                  ].map((i) => (
                    <button
                      key={i.label}
                      onClick={() => {
                        setMenu(null);
                        push({ title: `${i.label} is a demo action`, body: "Wire this to your auth provider. See Guide & setup.", tone: "info" });
                      }}
                      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
                    >
                      <i.icon size={15} className="text-ink-4" />
                      {i.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

/** Headline figures for a workspace, so the switcher shows real differences. */
function monthlySnapshot(id: string) {
  const ms = driversForBrand(id).map(computeMonth);
  const last = ms[ms.length - 1];
  return { revenue: last.totalRevenue, margin: last.netMarginPct };
}

function ThemeSwitch({
  choice,
  resolved,
  onChange,
}: {
  choice: ThemeChoice;
  resolved: "light" | "dark";
  onChange: (c: ThemeChoice) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutside<HTMLDivElement>(() => setOpen(false));
  const options: { id: ThemeChoice; label: string; icon: typeof Sun }[] = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ];

  return (
    <div ref={ref} className="relative">
      <IconButton label="Appearance" onClick={() => setOpen((v) => !v)} active={open}>
        {resolved === "dark" ? <Moon size={16} /> : <Sun size={16} />}
      </IconButton>
      {open ? (
        <div className="anim-scale-in absolute top-full right-0 z-50 mt-1.5 w-40 origin-top-right rounded-lg border border-line bg-surface p-1.5 shadow-pop">
          {options.map((o) => (
            <button
              key={o.id}
              onClick={() => {
                onChange(o.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[12.5px] transition-colors",
                choice === o.id ? "bg-brand-soft text-brand-ink" : "text-ink-2 hover:bg-surface-3",
              )}
            >
              <o.icon size={14} />
              {o.label}
              {choice === o.id ? <Check size={13} className="ml-auto" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
