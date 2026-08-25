/**
 * Content for the in-product "Guide & setup" section: everything that has to
 * change to turn this prototype into a live product.
 */

export interface GuideTask {
  id: string;
  label: string;
  detail: string;
  effort: "S" | "M" | "L";
}

export interface GuideStage {
  id: string;
  title: string;
  summary: string;
  tasks: GuideTask[];
}

export const STAGES: GuideStage[] = [
  {
    id: "stage-data",
    title: "1 · Replace the demo dataset",
    summary: "Everything the product renders comes from four files. Swap them for real reads and the whole UI follows.",
    tasks: [
      { id: "t-model", label: "Point the driver series at your warehouse", detail: "Replace MONTH_DRIVERS in lib/data/model.ts with a query. Keep computeMonth(), it is the calculation contract the UI is written against.", effort: "M" },
      { id: "t-skus", label: "Aggregate SKU economics from orders", detail: "lib/data/skus.ts currently holds 16 seeded SKUs plus a residual row. Replace with a per-SKU roll-up; keep the invariant that SKU orders sum to the month's orders.", effort: "M" },
      { id: "t-inputs", label: "Persist manual inputs", detail: "EDITOR_SCHEMA in lib/data/workspace.ts defines the input tree. Values currently live in React state, move them to a monthly_inputs table.", effort: "M" },
      { id: "t-content", label: "Replace org and alert content", detail: "BRANDS, CURRENT_USER, NOTIFICATIONS, ALERTS, SAVED_VIEWS and CELL_COMMENTS are all seeded literals in lib/data/workspace.ts.", effort: "S" },
    ],
  },
  {
    id: "stage-api",
    title: "2 · Stand up the API",
    summary: "The store is the only place that reads data. Give it a fetch layer and nothing else in the app has to change.",
    tasks: [
      { id: "t-routes", label: "Create the route handlers", detail: "Add app/api/* routes for months, SKUs, inputs and preferences. Shapes are listed in the API section below.", effort: "L" },
      { id: "t-store", label: "Swap the store for server state", detail: "lib/store.tsx builds months from module-level constants. Replace with a fetch plus mutations; keep the same context shape so pages are untouched.", effort: "M" },
      { id: "t-cache", label: "Add caching and revalidation", detail: "Monthly figures change on sync, not per request. Cache aggressively and revalidate on webhook.", effort: "S" },
    ],
  },
  {
    id: "stage-auth",
    title: "3 · Add authentication and tenancy",
    summary: "There is no auth in the prototype. Every route is public and every workspace shows the same data.",
    tasks: [
      { id: "t-auth", label: "Add an auth provider", detail: "Auth.js, Clerk or Supabase Auth. Wrap the app in middleware.ts so every route under the shell requires a session.", effort: "M" },
      { id: "t-tenant", label: "Scope data to a workspace", detail: "The brand switcher in the topbar is cosmetic. Derive the active workspace from the session and filter every query by it.", effort: "M" },
      { id: "t-rbac", label: "Add roles", detail: "Founder, finance and analyst need different edit rights over statement inputs and calculation rules.", effort: "M" },
      { id: "t-audit", label: "Record an audit trail", detail: "Every manual override to a statement line should record who changed it, when, and the previous value.", effort: "S" },
    ],
  },
  {
    id: "stage-integrations",
    title: "4 · Connect the integrations",
    summary: "Every figure marked Shopify, Amazon, Meta or Google is currently seeded.",
    tasks: [
      { id: "t-shopify", label: "Shopify orders and payouts", detail: "Admin GraphQL API for orders, refunds and transactions. Register webhooks for orders/create, orders/updated and refunds/create.", effort: "L" },
      { id: "t-amazon", label: "Amazon Seller settlements", detail: "SP-API Finances and Reports for settlement and fee data.", effort: "L" },
      { id: "t-ads", label: "Meta and Google Ads spend", detail: "Marketing API and Google Ads API, pulled nightly into a spend table keyed by date and campaign.", effort: "M" },
      { id: "t-sheet", label: "Cost sheet import", detail: "Fields marked Sheet come from a Google Sheet today. Either keep Sheets via the Sheets API or move cost to your PIM.", effort: "M" },
    ],
  },
  {
    id: "stage-ship",
    title: "5 · Harden and ship",
    summary: "What stands between a good demo and something you can put a customer on.",
    tasks: [
      { id: "t-error", label: "Error and empty states", detail: "Charts assume data exists. Add loading, empty and failure states for every fetch.", effort: "M" },
      { id: "t-tests", label: "Test the calculation layer", detail: "computeMonth() and attributeChange() are pure functions. Unit test them against known statements before anyone relies on the output.", effort: "M" },
      { id: "t-obs", label: "Monitoring and analytics", detail: "Vercel Analytics plus an error tracker. Alert on sync failures, not just app errors.", effort: "S" },
      { id: "t-a11y", label: "Accessibility audit", detail: "Charts ship with table twins, keyboard focus and ARIA labels. Re-verify after you change the data layer.", effort: "S" },
    ],
  },
];

export interface EnvVar {
  key: string;
  purpose: string;
  example: string;
  required: boolean;
  group: string;
}

export const ENV_VARS: EnvVar[] = [
  { key: "DATABASE_URL", purpose: "Postgres connection string for the app database.", example: "postgresql://user:pass@host:5432/performity", required: true, group: "Database" },
  { key: "DIRECT_URL", purpose: "Direct (non-pooled) connection, needed for migrations.", example: "postgresql://user:pass@host:5432/performity", required: false, group: "Database" },
  { key: "AUTH_SECRET", purpose: "Signing secret for session cookies.", example: "openssl rand -base64 32", required: true, group: "Auth" },
  { key: "AUTH_URL", purpose: "Canonical URL of the deployment, used for OAuth callbacks.", example: "https://pnl.yourbrand.com", required: true, group: "Auth" },
  { key: "AUTH_GOOGLE_ID", purpose: "Google OAuth client id for team sign-in.", example: "1234567890-abc.apps.googleusercontent.com", required: false, group: "Auth" },
  { key: "AUTH_GOOGLE_SECRET", purpose: "Google OAuth client secret.", example: "GOCSPX-…", required: false, group: "Auth" },
  { key: "SHOPIFY_STORE_DOMAIN", purpose: "Shop domain the Admin API is called against.", example: "bxxyshoes.myshopify.com", required: true, group: "Integrations" },
  { key: "SHOPIFY_ADMIN_TOKEN", purpose: "Admin API access token with read_orders and read_products.", example: "shpat_…", required: true, group: "Integrations" },
  { key: "SHOPIFY_WEBHOOK_SECRET", purpose: "Verifies webhook payload signatures.", example: "whsec_…", required: true, group: "Integrations" },
  { key: "AMAZON_SP_CLIENT_ID", purpose: "Selling Partner API application client id.", example: "amzn1.application-oa2-client.…", required: false, group: "Integrations" },
  { key: "AMAZON_SP_CLIENT_SECRET", purpose: "Selling Partner API client secret.", example: "amzn1.oa2-cs.v1.…", required: false, group: "Integrations" },
  { key: "AMAZON_SP_REFRESH_TOKEN", purpose: "Long-lived refresh token for the seller account.", example: "Atzr|…", required: false, group: "Integrations" },
  { key: "META_ACCESS_TOKEN", purpose: "Long-lived system-user token for Marketing API spend reads.", example: "EAAG…", required: false, group: "Integrations" },
  { key: "META_AD_ACCOUNT_ID", purpose: "Ad account the spend is pulled from.", example: "act_1234567890", required: false, group: "Integrations" },
  { key: "GOOGLE_ADS_DEVELOPER_TOKEN", purpose: "Google Ads API developer token.", example: "abcdEFGH…", required: false, group: "Integrations" },
  { key: "GOOGLE_SHEETS_SERVICE_ACCOUNT", purpose: "Base64 service-account JSON for the cost sheet import.", example: "eyJ0eXBlIjoic2VydmljZV9…", required: false, group: "Integrations" },
  { key: "CRON_SECRET", purpose: "Shared secret protecting the scheduled sync endpoint.", example: "openssl rand -hex 24", required: true, group: "Jobs" },
  { key: "RESEND_API_KEY", purpose: "Sends the daily digest and the monthly board pack.", example: "re_…", required: false, group: "Notifications" },
  { key: "SLACK_WEBHOOK_URL", purpose: "Posts guardrail alerts into a channel.", example: "https://hooks.slack.com/services/…", required: false, group: "Notifications" },
];

export interface ApiRoute {
  method: string;
  path: string;
  purpose: string;
  returns: string;
  replaces: string;
}

export const API_ROUTES: ApiRoute[] = [
  { method: "GET", path: "/api/months", purpose: "Driver series for the requested window.", returns: "MonthDrivers[]", replaces: "MONTH_DRIVERS in lib/data/model.ts" },
  { method: "GET", path: "/api/months/[key]", purpose: "One month's drivers plus its saved manual inputs.", returns: "{ drivers, inputs }", replaces: "MONTH_BY_KEY lookup" },
  { method: "PATCH", path: "/api/months/[key]/inputs", purpose: "Persist an edit from the statement drawer.", returns: "{ drivers, inputs }", replaces: "commitEdits() in lib/store.tsx" },
  { method: "GET", path: "/api/skus", purpose: "Per-SKU economics for a period.", returns: "Sku[]", replaces: "SKUS in lib/data/skus.ts" },
  { method: "GET", path: "/api/preferences", purpose: "Calculation rules for the workspace.", returns: "CalculationPreferences", replaces: "PREFS in components/pnl/CalculationPreferences.tsx" },
  { method: "PUT", path: "/api/preferences", purpose: "Update which orders enter the statement.", returns: "CalculationPreferences", replaces: "local useState in the same component" },
  { method: "GET", path: "/api/alerts", purpose: "Guardrail breaches and sync notices.", returns: "Alert[]", replaces: "ALERTS in lib/data/workspace.ts" },
  { method: "POST", path: "/api/sync", purpose: "Kick a full re-pull from every connected source.", returns: "{ jobId }", replaces: "the fake timeout in components/shell/Topbar.tsx" },
  { method: "POST", path: "/api/webhooks/shopify", purpose: "Receive order and refund events; invalidate the month cache.", returns: "204", replaces: "nothing, new" },
  { method: "GET", path: "/api/cron/nightly", purpose: "Scheduled sync, protected by CRON_SECRET.", returns: "{ ok }", replaces: "nothing, new" },
  { method: "POST", path: "/api/reports/board", purpose: "Render and email the monthly board pack.", returns: "{ url }", replaces: "window.print() on the reports page" },
];

export interface MockItem {
  area: string;
  file: string;
  what: string;
  action: string;
}

export const MOCK_INVENTORY: MockItem[] = [
  { area: "Financial model", file: "lib/data/model.ts", what: "24 months of hand-authored drivers, tuned so August lands on a small loss.", action: "Replace ANCHORS with a query. Keep computeMonth() unchanged." },
  { area: "Workspaces", file: "lib/data/model.ts", what: "BRAND_PROFILES generates all three brands from one base series using multipliers.", action: "Read each workspace's own drivers instead of scaling a shared series." },
  { area: "Insights", file: "lib/data/insights.ts", what: "Sentences are computed from the live model, but the phrasing and thresholds are authored.", action: "Keep as-is, or route through an LLM once the numbers are real." },
  { area: "SKU economics", file: "lib/data/skus.ts", what: "16 seeded SKUs, rescaled to the active month, plus a long-tail row that absorbs the residual.", action: "Replace skuRowsFor() with a per-SKU aggregation over orders and ad spend." },
  { area: "Input schema", file: "lib/data/workspace.ts", what: "EDITOR_SCHEMA, 58 input fields, 12 of them deliberately blank to demo the completeness meter.", action: "Keep the schema; move values into the database." },
  { area: "Org and people", file: "lib/data/workspace.ts", what: "BRANDS, CURRENT_USER, NOTIFICATIONS, CELL_COMMENTS.", action: "Read from your auth provider and a comments table." },
  { area: "Alerts", file: "lib/data/workspace.ts", what: "Four static alerts.", action: "Generate from guardrail rules evaluated on sync." },
  { area: "Benchmarks", file: "lib/data/derived.ts", what: "Peer medians in benchmarks() are illustrative constants.", action: "Source from a benchmarking dataset, or remove the card." },
  { area: "Daily pacing", file: "lib/data/derived.ts", what: "dailyPacing() distributes the month across days with a fixed weekday curve and a fixed jitter table.", action: "Replace with actual daily order and cost data; keep the projection maths." },
  { area: "Sync status", file: "components/shell/Topbar.tsx", what: "'Synced 12m ago' is hardcoded; the sync button waits 1.6s and shows a toast.", action: "Poll a sync-status endpoint and trigger POST /api/sync." },
  { area: "Calculation rules", file: "components/pnl/CalculationPreferences.tsx", what: "Toggles hold local state and their 'impact' strings are fixed.", action: "Persist per workspace and compute the impact figures." },
  { area: "Export and email", file: "several pages", what: "Export, Upload data, Email to board and Assign raise a toast.", action: "Wire to real endpoints. Print / save as PDF already works via window.print()." },
  { area: "Filters", file: "app/explorer/page.tsx", what: "Channel, category and region filter the UI but read the same dataset.", action: "Pass them into the query behind /api/months and /api/skus." },
  { area: "Command palette", file: "components/shell/CommandPalette.tsx", what: "Searches the local dataset only.", action: "Back it with a search endpoint once the catalogue is real." },
];

export interface DbTable {
  name: string;
  purpose: string;
  columns: string;
}

export const DB_TABLES: DbTable[] = [
  { name: "workspaces", purpose: "One row per brand. Everything else is scoped by workspace_id.", columns: "id, name, slug, plan, currency, timezone, created_at" },
  { name: "users", purpose: "People with access, joined to workspaces through memberships.", columns: "id, email, name, avatar_url, created_at" },
  { name: "memberships", purpose: "Role of a user within a workspace.", columns: "user_id, workspace_id, role (owner|finance|analyst|viewer)" },
  { name: "integrations", purpose: "Connected sources and their credentials.", columns: "id, workspace_id, provider, status, credentials (encrypted), last_synced_at" },
  { name: "orders", purpose: "Normalised orders across channels. The grain everything rolls up from.", columns: "id, workspace_id, channel, external_id, placed_at, status, gross_amount, discount, refund, shipping_income, payment_method" },
  { name: "order_items", purpose: "Line items, so SKU economics can be aggregated.", columns: "id, order_id, sku, quantity, unit_price, unit_cost" },
  { name: "ad_spend", purpose: "Daily spend by platform and campaign.", columns: "id, workspace_id, platform, campaign_id, date, spend, impressions, clicks" },
  { name: "monthly_inputs", purpose: "Manual values entered in the statement drawer.", columns: "id, workspace_id, period (YYYY-MM), field_id, value, source, entered_by, entered_at" },
  { name: "input_history", purpose: "Audit trail of overrides.", columns: "id, monthly_input_id, previous_value, new_value, changed_by, changed_at" },
  { name: "calculation_preferences", purpose: "Which orders and costs enter the statement.", columns: "workspace_id, exclude_unfulfilled, include_partial, exclude_cancelled, allocate_fixed, accrual_basis, excluded_tags" },
  { name: "alerts", purpose: "Guardrail breaches, generated on sync.", columns: "id, workspace_id, rule_id, severity, title, detail, created_at, acknowledged_at" },
  { name: "comments", purpose: "Threads anchored to a statement row and period.", columns: "id, workspace_id, row_id, period, author_id, body, resolved, created_at" },
];
