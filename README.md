# Performity — P&L 2.0

A profitability intelligence platform for D2C brands. It answers one question
well: **where did the money go, and what do we do about it?**

Built as a working prototype — every screen is interactive, every figure is
computed, and the whole thing deploys to Vercel with zero configuration.

![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat-square)
![React](https://img.shields.io/badge/React-19-087ea4?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square)

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run build      # production build
npm run typecheck  # tsc --noEmit
```

No environment variables, no database, no external services are needed to run
it. See [`.env.example`](.env.example) for what each integration will need
later.

---

## Deploying — GitHub → GitHub Desktop → Vercel

1. **GitHub Desktop** → File → *Add Local Repository* → pick this folder. A git
   repository with an initial commit is already here.
2. Click **Publish repository** (private is a good default).
3. **vercel.com** → *Add New → Project* → import the repo.
4. Leave every build setting on its default — framework detection finds
   Next.js.
5. **Deploy.** Pushes to `main` ship to production; branches get preview URLs.

Nothing needs configuring for the prototype to deploy successfully.

---

## What's in it

| Route | What it does |
|---|---|
| `/overview` | The month at a glance — KPI tiles, cost composition, profit bridge, condensed statement |
| `/story` | *What changed* — a written explanation of the profit move, with every rupee attributed to a driver |
| `/statement` | The full P&L, with an input editor that recalculates the statement live |
| `/forecast` | Month-to-date pacing, projection to close, break-even analysis, and five solved levers |
| `/unit-economics` | Per-order economics and per-SKU profitability, with a kill list |
| `/explorer` | Profit-flow Sankey, margin-leak heatmap, and a what-if simulator |
| `/reports` | A print-ready board pack and the daily digest |
| `/guide` | **Go-live guide** — everything to change to turn this into a real product |

Press <kbd>⌘</kbd><kbd>K</kbd> anywhere for the command palette.
<kbd>⌘</kbd><kbd>\\</kbd> collapses the sidebar.

---

## The idea behind the build

### One model, many views

Everything derives from a single pure function:

```ts
// lib/data/model.ts
computeMonth(drivers: MonthDrivers): MonthFigures
```

Feed it orders and per-order economics; it returns the full statement. Because
every page reads from it rather than from stored figures:

- **the statement always foots** — sub-lines sum to their totals, totals roll
  into net profit, and revenue reconciles across channels;
- **the driver attribution is computed, not authored** — `attributeChange()`
  substitutes one driver at a time into the same equation, so the waterfall
  sums exactly to the change in profit with no residual;
- **the what-if simulator is real arithmetic** — sliders write drivers and the
  month is recomputed end to end;
- **editing an input updates everything at once** — the statement drawer writes
  back into the model, and every card, chart and table follows.

The demo month is tuned to land on a −₹18,640 net profit on 2,847 orders: a
brand growing revenue while its acquisition cost quietly eats a 9% margin.

### Data visualization

Charts are hand-built SVG rather than a charting library, so the marks hold to
one spec: thin marks, 4px rounded data-ends anchored to the baseline, a 2px
surface gap between stacked fills, solid hairline gridlines, and hover targets
much larger than the marks. A few decisions worth knowing about:

- **No dual-axis charts.** Two y-scales on one plot invent a correlation that
  isn't in the data. Where the concept sketch had one, it is drawn as two
  panels sharing an x-axis instead.
- **Every chart has a table twin.** The toggle in each chart card's header
  switches to the underlying numbers, so no value is reachable only by
  hovering.
- **The categorical palette is validated, not eyeballed.** Six slots, checked
  for lightness band, chroma floor, colourblind separation (OKLab ΔE),
  normal-vision separation and surface contrast — separately for light and
  dark, because the dark palette is re-stepped for its surface rather than
  flipped. Slot order is fixed, so colour follows the entity and a filter never
  repaints the survivors.
- **Status colours are reserved.** Green and red mean good and bad; they are
  never used as a series colour, and they always ship with an icon and a label
  so colour is never the only channel.
- **Dashed strokes mean one thing:** modelled, not observed. Only the
  projection uses them.

### Accessibility

Semantic tables with `<caption>`, `scope` and sticky headers; keyboard-focusable
chart marks with ARIA labels; a legend whenever there are two or more series;
`prefers-reduced-motion` honoured throughout; visible focus rings; and a dark
theme that is a designed palette rather than an inverted one.

---

## Project structure

```
app/
  layout.tsx            root layout — theme boot, providers, app shell
  globals.css           design tokens, motion, print styles
  overview/ story/ statement/ forecast/
  unit-economics/ explorer/ reports/ guide/

components/
  shell/                sidebar, topbar, command palette, theme, toasts
  ui/                   buttons, cards, drawer, select, toggle, badges
  charts/               every chart, hand-built SVG + shared primitives
  pnl/                  statement table, input drawer, KPI cards

lib/
  data/model.ts         ⭐ the calculation engine and the driver series
  data/skus.ts          per-SKU economics (derived, not authored)
  data/derived.ts       attribution, pacing, insights, benchmarks
  data/workspace.ts     input schema, alerts, org content
  data/guide.ts         go-live guide content
  store.tsx             workspace state — the only place data is read
  format.ts             Indian-locale currency and number formatting
```

---

## Turning this into a live product

**Open `/guide` inside the running app.** It is a full go-live playbook: a
staged roadmap you can tick off, an inventory of every fabricated number and
the file it lives in, the API routes to build with their shapes, every
environment variable, where authentication and the database attach, a workable
schema, and the integration notes for Shopify, Amazon, Meta, Google and your
payment gateway.

The short version:

| What | Where | Replace with |
|---|---|---|
| Monthly drivers | `lib/data/model.ts` → `MONTH_DRIVERS` | A query. Keep `computeMonth()`. |
| SKU economics | `lib/data/skus.ts` → `SEEDS` | A per-SKU aggregation over orders. |
| Manual inputs | `lib/data/workspace.ts` → `EDITOR_SCHEMA` | Keep the schema; persist the values. |
| Data access | `lib/store.tsx` | A fetch layer. The context shape stays the same, so no page changes. |
| Auth | *nothing today* | `middleware.ts` + a session with a `workspaceId`. |
| Org, alerts, comments | `lib/data/workspace.ts` | Your auth provider and database. |

`computeMonth()` is the contract the whole UI is written against. Keep its
shape and the interface comes along for free.

---

## Notes

- Four runtime dependencies: `next`, `react`, `react-dom`, `lucide-react`.
- The in-product date is 25 Aug 2026, with August as the month in progress.
- `Print / save as PDF` on `/reports` produces a clean A4 sheet with no app
  chrome.
