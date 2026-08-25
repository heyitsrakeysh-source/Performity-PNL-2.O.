"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Cloud,
  Database,
  FlaskConical,
  GitBranch,
  KeyRound,
  Plug,
  Rocket,
  Server,
  Table2,
} from "lucide-react";
import { API_ROUTES, DB_TABLES, ENV_VARS, MOCK_INVENTORY, STAGES } from "@/lib/data/guide";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Chip, ProgressBar, StatusBadge } from "@/components/ui/Bits";
import { CodeBlock, FilePath } from "@/components/ui/CodeBlock";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const SECTIONS = [
  { id: "roadmap", label: "Go-live roadmap", icon: Rocket },
  { id: "data", label: "Demo data inventory", icon: FlaskConical },
  { id: "api", label: "API endpoints", icon: Server },
  { id: "env", label: "Environment variables", icon: KeyRound },
  { id: "auth", label: "Authentication", icon: KeyRound },
  { id: "db", label: "Database", icon: Database },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "deploy", label: "Deploy to Vercel", icon: Cloud },
  { id: "checklist", label: "Pre-production checklist", icon: CheckCircle2 },
];

const ALL_TASKS = STAGES.flatMap((s) => s.tasks);

export default function GuidePage() {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [active, setActive] = useState("roadmap");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("performity-guide-progress");
      if (raw) setDone(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* progress is a convenience, not state we depend on */
    }
  }, []);

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem("performity-guide-progress", JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const progress = (done.size / ALL_TASKS.length) * 100;

  const envByGroup = useMemo(() => {
    const map = new Map<string, typeof ENV_VARS>();
    for (const v of ENV_VARS) {
      if (!map.has(v.group)) map.set(v.group, []);
      map.get(v.group)!.push(v);
    }
    return [...map.entries()];
  }, []);

  const envFile = ENV_VARS.map((v) => `# ${v.purpose}${v.required ? "" : "  (optional)"}\n${v.key}=${v.example}`).join("\n\n");

  return (
    <PageShell>
      <PageHeader
        eyebrow={
          <>
            <Chip tone="warning">Prototype</Chip>
            <StatusBadge status="info" label="No auth · no database · demo data" />
          </>
        }
        title="Guide & setup"
        subtitle="Everything standing between this prototype and a live product: which numbers are fake, which endpoints to build, what to put in the environment, where authentication and the database attach, and how to get it onto Vercel. Work top to bottom."
        actions={
          <Button href="#deploy" variant="primary" icon={<Cloud size={14} />}>
            Deployment steps
          </Button>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[228px_minmax(0,1fr)]">
        {/* ------------------------------------------------------- sub-nav --- */}
        <aside className="xl:sticky xl:top-[76px] xl:self-start">
          <Card padded={false}>
            <div className="border-b border-line px-4 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[12.5px] font-semibold text-ink">Progress</span>
                <span className="tnum text-[12.5px] font-bold text-brand-ink">
                  {done.size}/{ALL_TASKS.length}
                </span>
              </div>
              <ProgressBar value={progress} className="mt-2" tone={progress === 100 ? "good" : "brand"} />
            </div>
            <nav className="p-2">
              <ul className="space-y-0.5">
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[12.5px] font-medium transition-colors",
                        active === s.id ? "bg-brand-soft text-brand-ink" : "text-ink-2 hover:bg-surface-3 hover:text-ink",
                      )}
                    >
                      <s.icon size={14} className="shrink-0" />
                      <span className="truncate">{s.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </Card>
        </aside>

        <div className="min-w-0 space-y-4">
          {/* ------------------------------------------------- what it is --- */}
          <Card className="aurora overflow-hidden">
            <span className="aurora-layer" aria-hidden />
            <h2 className="text-[16px] font-semibold text-ink">What you are looking at</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                {
                  t: "Real calculations",
                  b: "The whole product derives from one pure function, computeMonth(), in lib/data/model.ts. Sub-lines foot to totals, the waterfall attribution sums exactly to the change in profit, and the what-if simulator recomputes the real model. None of it is hardcoded output.",
                  tone: "good" as const,
                },
                {
                  t: "Demo inputs",
                  b: "The numbers feeding that function are authored, not fetched: 18 months of drivers, 16 SKUs and 58 input fields. There is no database, no API layer and no auth. Every workspace shows the same dataset.",
                  tone: "warning" as const,
                },
                {
                  t: "Production-ready shell",
                  b: "Routing, theming, accessibility, responsive layout, print output and the component system are all built to ship. Replacing the data layer does not require touching any page.",
                  tone: "good" as const,
                },
              ].map((c) => (
                <div key={c.t} className="rounded-lg border border-line bg-surface p-3.5">
                  <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                    {c.tone === "good" ? (
                      <CheckCircle2 size={14} className="text-good" />
                    ) : (
                      <AlertTriangle size={14} className="text-warning" />
                    )}
                    {c.t}
                  </p>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-3">{c.b}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* --------------------------------------------------- roadmap --- */}
          <section id="roadmap" className="scroll-mt-20">
            <Card>
              <CardHeader
                title="Go-live roadmap"
                subtitle="Five stages, in order. Tick items off as you go — progress is saved in this browser."
                action={<Chip tone={progress === 100 ? "good" : "brand"}>{Math.round(progress)}% done</Chip>}
              />
              <div className="mt-4 space-y-4">
                {STAGES.map((stage) => {
                  const stageDone = stage.tasks.filter((t) => done.has(t.id)).length;
                  return (
                    <div key={stage.id} className="overflow-hidden rounded-lg border border-line">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-surface-2 px-4 py-3">
                        <h3 className="text-[13.5px] font-semibold text-ink">{stage.title}</h3>
                        <p className="min-w-[200px] flex-1 text-[11.5px] text-ink-3">{stage.summary}</p>
                        <span
                          className={cn(
                            "tnum rounded-full px-2 py-0.5 text-[10.5px] font-bold",
                            stageDone === stage.tasks.length ? "bg-good-soft text-good-ink" : "bg-surface-3 text-ink-3",
                          )}
                        >
                          {stageDone}/{stage.tasks.length}
                        </span>
                      </div>
                      <ul className="divide-y divide-line-soft">
                        {stage.tasks.map((t) => {
                          const checked = done.has(t.id);
                          return (
                            <li key={t.id}>
                              <button
                                onClick={() => toggle(t.id)}
                                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2"
                              >
                                {checked ? (
                                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-good" />
                                ) : (
                                  <Circle size={16} className="mt-0.5 shrink-0 text-ink-4" />
                                )}
                                <span className="min-w-0 flex-1">
                                  <span
                                    className={cn(
                                      "block text-[12.5px] font-medium",
                                      checked ? "text-ink-4 line-through" : "text-ink",
                                    )}
                                  >
                                    {t.label}
                                  </span>
                                  <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-3">{t.detail}</span>
                                </span>
                                <span className="shrink-0 rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] font-bold text-ink-3">
                                  {t.effort}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </Card>
          </section>

          {/* ------------------------------------------------------ mocks --- */}
          <section id="data" className="scroll-mt-20">
            <Card>
              <CardHeader
                title="Demo data inventory"
                subtitle="Every place a number, name or action is fabricated — and what replaces it"
                action={<Chip tone="warning">{MOCK_INVENTORY.length} items</Chip>}
              />
              <div className="mt-4 overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[760px] border-collapse text-[12px]">
                  <thead className="bg-surface-2">
                    <tr>
                      {["Area", "File", "What is fake", "What to do"].map((h) => (
                        <th key={h} scope="col" className="border-b border-line px-3 py-2.5 text-left text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_INVENTORY.map((m) => (
                      <tr key={m.area + m.file} className="transition-colors hover:bg-surface-2">
                        <td className="border-b border-line-soft px-3 py-2.5 font-medium whitespace-nowrap text-ink">{m.area}</td>
                        <td className="border-b border-line-soft px-3 py-2.5 whitespace-nowrap">
                          <FilePath>{m.file}</FilePath>
                        </td>
                        <td className="border-b border-line-soft px-3 py-2.5 text-ink-2">{m.what}</td>
                        <td className="border-b border-line-soft px-3 py-2.5 text-ink-2">{m.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 rounded-lg border border-line bg-brand-soft p-4">
                <p className="text-[12.5px] font-semibold text-brand-ink">The one thing not to change</p>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-brand-ink/90">
                  <code className="font-mono">computeMonth()</code> in <FilePath>lib/data/model.ts</FilePath> is the
                  calculation contract every page is written against. Feed it real drivers and the statement, the
                  charts, the attribution and the simulator all become real at once. Change its shape and you are
                  rewriting the UI.
                </p>
              </div>
            </Card>
          </section>

          {/* -------------------------------------------------------- api --- */}
          <section id="api" className="scroll-mt-20">
            <Card>
              <CardHeader
                title="API endpoints to build"
                subtitle="Route handlers under app/api. The store is the only consumer, so these shapes are the whole contract."
              />
              <div className="mt-4 overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[820px] border-collapse text-[12px]">
                  <thead className="bg-surface-2">
                    <tr>
                      {["Method", "Path", "Purpose", "Returns", "Replaces"].map((h) => (
                        <th key={h} scope="col" className="border-b border-line px-3 py-2.5 text-left text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {API_ROUTES.map((r) => (
                      <tr key={r.method + r.path} className="transition-colors hover:bg-surface-2">
                        <td className="border-b border-line-soft px-3 py-2.5">
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 font-mono text-[10.5px] font-bold",
                              r.method === "GET" && "bg-brand-soft text-brand-ink",
                              r.method === "POST" && "bg-good-soft text-good-ink",
                              (r.method === "PATCH" || r.method === "PUT") && "bg-warning-soft text-warning-ink",
                            )}
                          >
                            {r.method}
                          </span>
                        </td>
                        <td className="border-b border-line-soft px-3 py-2.5 font-mono text-[11.5px] whitespace-nowrap text-ink">{r.path}</td>
                        <td className="border-b border-line-soft px-3 py-2.5 text-ink-2">{r.purpose}</td>
                        <td className="border-b border-line-soft px-3 py-2.5 font-mono text-[11px] whitespace-nowrap text-ink-3">{r.returns}</td>
                        <td className="border-b border-line-soft px-3 py-2.5 text-[11.5px] text-ink-3">{r.replaces}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                <CodeBlock
                  label="app/api/months/route.ts"
                  code={`import { NextResponse } from "next/server";
import { computeMonth } from "@/lib/data/model";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const months = Number(searchParams.get("months") ?? 12);

  const drivers = await db.monthlyDrivers.findMany({
    where: { workspaceId: session.workspaceId },
    orderBy: { period: "asc" },
    take: months,
  });

  // Same pure function the prototype uses — nothing downstream changes.
  return NextResponse.json(drivers.map(computeMonth));
}`}
                />
                <CodeBlock
                  label="lib/store.tsx — swap the source"
                  code={`// Prototype:
const months = useMemo(
  () => MONTH_DRIVERS.map((d) => computeMonth(applyOverride(d, overrides[d.key]))),
  [overrides],
);

// Production: fetch drivers, keep the same derivation.
const { data: drivers = [] } = useQuery({
  queryKey: ["months", workspaceId, period],
  queryFn: () => fetch(\`/api/months?months=\${period}\`).then((r) => r.json()),
});

const months = useMemo(
  () => drivers.map((d) => computeMonth(applyOverride(d, overrides[d.key]))),
  [drivers, overrides],
);`}
                />
              </div>
            </Card>
          </section>

          {/* -------------------------------------------------------- env --- */}
          <section id="env" className="scroll-mt-20">
            <Card>
              <CardHeader
                title="Environment variables"
                subtitle="Set these in Vercel under Project → Settings → Environment Variables, and locally in .env.local"
                action={<Chip tone="critical">{ENV_VARS.filter((v) => v.required).length} required</Chip>}
              />
              <div className="mt-4 space-y-4">
                {envByGroup.map(([group, vars]) => (
                  <div key={group}>
                    <p className="label-xs mb-2">{group}</p>
                    <ul className="overflow-hidden rounded-lg border border-line">
                      {vars.map((v, i) => (
                        <li key={v.key} className={cn("flex flex-wrap items-start gap-x-4 gap-y-1 px-4 py-3", i > 0 && "border-t border-line-soft")}>
                          <div className="min-w-[230px]">
                            <code className="font-mono text-[12px] font-semibold text-ink">{v.key}</code>
                            {v.required ? (
                              <span className="ml-2 rounded bg-critical-soft px-1.5 py-px text-[9.5px] font-bold tracking-wide text-critical-ink uppercase">
                                required
                              </span>
                            ) : (
                              <span className="ml-2 rounded bg-surface-3 px-1.5 py-px text-[9.5px] font-bold tracking-wide text-ink-4 uppercase">
                                optional
                              </span>
                            )}
                          </div>
                          <p className="min-w-[200px] flex-1 text-[11.5px] text-ink-2">{v.purpose}</p>
                          <code className="max-w-full truncate font-mono text-[11px] text-ink-4">{v.example}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <details className="mt-4 rounded-lg border border-line">
                <summary className="cursor-pointer px-4 py-3 text-[12.5px] font-medium text-ink transition-colors hover:bg-surface-2">
                  Show the full .env.example
                </summary>
                <div className="border-t border-line p-3">
                  <CodeBlock label=".env.example" code={envFile} />
                </div>
              </details>
            </Card>
          </section>

          {/* ------------------------------------------------------- auth --- */}
          <section id="auth" className="scroll-mt-20">
            <Card>
              <CardHeader
                title="Authentication"
                subtitle="There is none today. Every route renders for anyone who has the URL."
              />
              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                <ol className="space-y-3">
                  <Step n={1} title="Install a provider">
                    Auth.js v5 works cleanly with the App Router. Clerk or Supabase Auth are equally fine — the app
                    only needs a session with a <code className="font-mono">workspaceId</code>.
                  </Step>
                  <Step n={2} title="Protect the shell">
                    Add <FilePath>middleware.ts</FilePath> at the repo root. Everything under the app shell should
                    require a session; only the sign-in route stays public.
                  </Step>
                  <Step n={3} title="Feed the topbar">
                    <FilePath>components/shell/Topbar.tsx</FilePath> reads <code className="font-mono">CURRENT_USER</code>{" "}
                    and <code className="font-mono">BRANDS</code> from the demo file. Replace with the session user and
                    their memberships.
                  </Step>
                  <Step n={4} title="Gate the edit paths">
                    Saving statement inputs and changing calculation rules should be role-checked on the server, not
                    only hidden in the UI.
                  </Step>
                </ol>
                <CodeBlock
                  label="middleware.ts"
                  code={`import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isAuthed = Boolean(req.auth?.user);
  const isPublic = req.nextUrl.pathname.startsWith("/sign-in");

  if (!isAuthed && !isPublic) {
    const url = new URL("/sign-in", req.nextUrl.origin);
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    // everything except static assets and the auth routes
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};`}
                />
              </div>
            </Card>
          </section>

          {/* --------------------------------------------------------- db --- */}
          <section id="db" className="scroll-mt-20">
            <Card>
              <CardHeader
                title="Database"
                subtitle="A workable schema. Orders are the grain — everything above them is an aggregation."
                action={<Chip tone="neutral">{DB_TABLES.length} tables</Chip>}
              />
              <div className="mt-4 overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[720px] border-collapse text-[12px]">
                  <thead className="bg-surface-2">
                    <tr>
                      {["Table", "Purpose", "Columns"].map((h) => (
                        <th key={h} scope="col" className="border-b border-line px-3 py-2.5 text-left text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DB_TABLES.map((t) => (
                      <tr key={t.name} className="transition-colors hover:bg-surface-2">
                        <td className="border-b border-line-soft px-3 py-2.5 font-mono text-[11.5px] font-semibold whitespace-nowrap text-brand-ink">
                          {t.name}
                        </td>
                        <td className="border-b border-line-soft px-3 py-2.5 text-ink-2">{t.purpose}</td>
                        <td className="border-b border-line-soft px-3 py-2.5 font-mono text-[11px] text-ink-3">{t.columns}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-line bg-surface-2 p-3.5">
                <Table2 size={15} className="mt-px shrink-0 text-ink-4" />
                <p className="text-[11.5px] leading-relaxed text-ink-3">
                  Vercel Postgres, Neon and Supabase all work without configuration beyond{" "}
                  <code className="font-mono">DATABASE_URL</code>. Use a pooled connection for the app and{" "}
                  <code className="font-mono">DIRECT_URL</code> for migrations. Compute monthly drivers in a scheduled
                  job rather than per request — the statement reads them thousands of times more often than they change.
                </p>
              </div>
            </Card>
          </section>

          {/* ----------------------------------------------- integrations --- */}
          <section id="integrations" className="scroll-mt-20">
            <Card>
              <CardHeader title="Integrations" subtitle="Where each figure in the statement is meant to come from" />
              <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {[
                  { name: "Shopify", scopes: "read_orders, read_products, read_shipping", feeds: "Net sales, shipping income, gateway fees, order and refund volume", note: "Register orders/create, orders/updated and refunds/create webhooks so the month invalidates on change rather than on a timer." },
                  { name: "Amazon Seller Central", scopes: "SP-API Finances, Reports", feeds: "Marketplace sales, referral and FBA fees, settlement adjustments", note: "Settlements arrive on a two-week cycle — reconcile retroactively and expect prior months to move." },
                  { name: "Meta Ads", scopes: "ads_read", feeds: "Paid media spend, impressions and clicks by campaign", note: "Pull nightly into a daily spend table. Blended CAC is derived from spend ÷ orders, not from platform-attributed purchases." },
                  { name: "Google Ads", scopes: "adwords", feeds: "Search and PMax spend by campaign", note: "Same daily spend table as Meta so blended CAC stays one number." },
                  { name: "Cost sheet", scopes: "Sheets API read", feeds: "Unit cost, packaging and courier rates", note: "The weakest link in most setups. Move to a PIM when unit cost starts changing more than monthly." },
                  { name: "Payment gateway", scopes: "Razorpay / Stripe read", feeds: "Transaction fees, chargebacks, COD remittance", note: "Fees differ by payment method; keep the method on the order so the split stays derivable." },
                ].map((i) => (
                  <li key={i.name} className="rounded-lg border border-line bg-surface-2 p-3.5">
                    <div className="flex items-center gap-2">
                      <Plug size={14} className="text-brand" />
                      <p className="text-[13px] font-semibold text-ink">{i.name}</p>
                      <span className="ml-auto rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-ink-4">{i.scopes}</span>
                    </div>
                    <p className="mt-2 text-[11.5px] text-ink-2">
                      <strong className="text-ink">Feeds:</strong> {i.feeds}
                    </p>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-3">{i.note}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </section>

          {/* ----------------------------------------------------- deploy --- */}
          <section id="deploy" className="scroll-mt-20">
            <Card>
              <CardHeader
                title="Deploy: GitHub → GitHub Desktop → Vercel"
                subtitle="The repo is already configured for this. No build settings to change."
              />
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ol className="space-y-3">
                  <Step n={1} title="Open the folder in GitHub Desktop">
                    File → Add Local Repository → choose <FilePath>performity-pnl</FilePath>. A git repository is
                    already initialised with an initial commit, so it will appear ready to publish.
                  </Step>
                  <Step n={2} title="Publish the repository">
                    Click <strong>Publish repository</strong>. Keep it private if the numbers are ever going to be
                    real. <FilePath>.gitignore</FilePath> already excludes{" "}
                    <code className="font-mono">node_modules</code>, <code className="font-mono">.next</code> and{" "}
                    <code className="font-mono">.env*.local</code>.
                  </Step>
                  <Step n={3} title="Import into Vercel">
                    vercel.com → Add New → Project → import the repo. Framework detection finds Next.js; leave the
                    build command, output directory and install command on their defaults.
                  </Step>
                  <Step n={4} title="Add environment variables">
                    None are needed for the prototype — it builds and runs with zero configuration. Add them from the
                    section above as you connect each real source.
                  </Step>
                  <Step n={5} title="Deploy">
                    Every push to <code className="font-mono">main</code> ships to production; every branch gets a
                    preview URL. Node 20 or newer, which is Vercel&apos;s default.
                  </Step>
                </ol>

                <div className="space-y-3">
                  <CodeBlock
                    label="Command line, if you prefer it"
                    code={`# from the project folder
git remote add origin https://github.com/<you>/performity-pnl.git
git branch -M main
git push -u origin main

# or deploy straight from the CLI
npx vercel --prod`}
                  />
                  <CodeBlock
                    label="Local development"
                    code={`npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run typecheck`}
                  />
                  <div className="flex items-start gap-2.5 rounded-lg border border-line bg-good-soft p-3.5">
                    <GitBranch size={15} className="mt-px shrink-0 text-good-ink" />
                    <p className="text-[11.5px] leading-relaxed text-good-ink">
                      <strong>Deploys clean as-is.</strong> No environment variables, no database, no external
                      services. Four runtime dependencies: next, react, react-dom and lucide-react.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* -------------------------------------------------- checklist --- */}
          <section id="checklist" className="scroll-mt-20">
            <Card>
              <CardHeader title="Before you put a customer on it" subtitle="The things that are easy to forget" />
              <ul className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                {[
                  "Every figure traces to a source you can audit, not to a seeded constant",
                  "Manual overrides record who changed what, when, and from which value",
                  "Statement inputs are role-gated on the server, not only hidden in the UI",
                  "Sync failures raise an alert — a stale number is worse than a missing one",
                  "computeMonth() and attributeChange() are unit-tested against known statements",
                  "Prior months are locked once closed, or clearly marked when they move",
                  "Currency, timezone and fiscal-year start come from the workspace, not from constants",
                  "Rate limits and retries on every integration pull",
                  "Credentials are encrypted at rest, never in environment variables per workspace",
                  "The board PDF renders correctly at A4 in the browser you will actually print from",
                  "Empty, loading and error states exist for every chart",
                  "Charts keep their table twins after the data layer changes",
                ].map((c) => (
                  <li key={c} className="flex items-start gap-2.5 rounded-lg border border-line bg-surface-2 px-3.5 py-2.5">
                    <Circle size={13} className="mt-0.5 shrink-0 text-ink-4" />
                    <span className="text-[11.5px] leading-relaxed text-ink-2">{c}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        </div>
      </div>
    </PageShell>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 rounded-lg border border-line bg-surface-2 p-3.5">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-bold text-white">
        {n}
      </span>
      <div className="min-w-0">
        <p className="text-[12.5px] font-semibold text-ink">{title}</p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">{children}</p>
      </div>
    </li>
  );
}
