/**
 * Indian-locale number and currency formatting.
 *
 * Every figure in the product flows through here so grouping (lakh/crore),
 * sign placement and precision stay consistent across cards, tables, axes,
 * tooltips and the printed report.
 */

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const RUPEE = "₹";

/** ₹52,58,280. Full precision, Indian grouping. */
export function money(value: number, opts: { decimals?: boolean; sign?: boolean } = {}) {
  const { decimals = false, sign = false } = opts;
  const n = Math.abs(value);
  const body = decimals ? inr2.format(n) : inr.format(Math.round(n));
  const prefix = value < 0 ? "−" : sign ? "+" : "";
  return `${prefix}${RUPEE}${body}`;
}

/** ₹52.58L / ₹1.50Cr / ₹8,420. For axes, tiles and dense tables. */
export function moneyCompact(value: number, opts: { sign?: boolean } = {}) {
  const n = Math.abs(value);
  const prefix = value < 0 ? "−" : opts.sign ? "+" : "";
  if (n >= 1_00_00_000) return `${prefix}${RUPEE}${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (n >= 1_00_000) return `${prefix}${RUPEE}${(n / 1_00_000).toFixed(2)}L`;
  if (n >= 1_000) return `${prefix}${RUPEE}${inr.format(Math.round(n))}`;
  return `${prefix}${RUPEE}${Math.round(n)}`;
}

/** Axis ticks: ₹60L, ₹0, −₹20L. No decimals, minimal ink. */
export function axisMoney(value: number) {
  const n = Math.abs(value);
  const prefix = value < 0 ? "−" : "";
  if (n === 0) return `${RUPEE}0`;
  if (n >= 1_00_00_000) return `${prefix}${RUPEE}${trim(n / 1_00_00_000)}Cr`;
  if (n >= 1_00_000) return `${prefix}${RUPEE}${trim(n / 1_00_000)}L`;
  if (n >= 1_000) return `${prefix}${RUPEE}${trim(n / 1_000)}K`;
  return `${prefix}${RUPEE}${Math.round(n)}`;
}

function trim(n: number) {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/** 1,847. Plain counts with Indian grouping. */
export function num(value: number, decimals = 0) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** 38.3% */
export function pct(value: number, decimals = 1) {
  return `${value.toFixed(decimals)}%`;
}

/** +9.5% / −28.6%. A signed rate of change. */
export function pctDelta(value: number, decimals = 1) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(decimals)}%`;
}

/**
 * A signed difference between two percentages. Written with a % sign rather
 * than "pp": the audience for this product reads percentage points as jargon.
 */
export function ppDelta(value: number, decimals = 1) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(decimals)}%`;
}

/** Accounting negatives for statement tables: (45,760). */
export function accounting(value: number) {
  const body = inr.format(Math.abs(Math.round(value)));
  return value < 0 ? `(${body})` : body;
}

/** Percentage change guarded against a zero or sign-flipping base. */
export function changePct(current: number, previous: number): number | null {
  if (previous === 0 || !Number.isFinite(previous)) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export type Direction = "up" | "down" | "flat";

export function direction(delta: number | null, epsilon = 0.05): Direction {
  if (delta === null || Math.abs(delta) < epsilon) return "flat";
  return delta > 0 ? "up" : "down";
}

/**
 * Whether a movement is good news. Cost and acquisition metrics invert:
 * a rising CAC is bad even though the arrow points up.
 */
export function tone(delta: number | null, higherIsBetter = true): "good" | "bad" | "neutral" {
  const d = direction(delta);
  if (d === "flat") return "neutral";
  const rising = d === "up";
  return rising === higherIsBetter ? "good" : "bad";
}
