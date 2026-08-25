/**
 * Chart insights.
 *
 * Every chart in the product carries a sentence written from the numbers it is
 * displaying: what the chart shows, which line is responsible, and how it
 * compares both to the selected comparison period and to the best month in
 * range. Nothing here is authored prose with a number slotted in; each string
 * is assembled from the live model, so it stays true when a filter changes,
 * a brand is switched, or an input is edited.
 */

import type { MonthFigures, QuarterFigures } from "./model";
import { attributeChange } from "./derived";
import { money, moneyCompact, num, pct } from "../format";

export interface Insight {
  text: string;
  detail?: string;
  tone: "good" | "bad" | "neutral";
}

const signed = (v: number) => `${v >= 0 ? "+" : "−"}${money(Math.abs(v)).replace("−", "")}`;

function changePct(a: number, b: number) {
  if (!b) return 0;
  return ((a - b) / Math.abs(b)) * 100;
}

/* ============================================================================
 * The core explanation: why profit moved, and which line did it
 * ==========================================================================*/

export function explainProfitMove(
  current: MonthFigures,
  comparison: MonthFigures,
  best?: MonthFigures,
): Insight {
  const delta = current.netProfit - comparison.netProfit;
  const drivers = attributeChange(comparison, current);
  const hurt = drivers.filter((d) => d.impact < 0);
  const helped = drivers.filter((d) => d.impact > 0);
  const worst = hurt[0];
  const bestDriver = helped[0];

  const direction = delta < 0 ? "fell" : "rose";
  const head =
    `Net profit ${direction} ${money(Math.abs(delta))} to ${money(current.netProfit)} ` +
    `(${pct(current.netMarginPct, 2)} margin) against ${comparison.label}.`;

  const parts: string[] = [];
  if (worst) {
    parts.push(
      `${worst.label} did the most damage at ${signed(worst.impact)} (${worst.detail})`,
    );
  }
  if (bestDriver) {
    parts.push(`${bestDriver.label.toLowerCase()} pulled back ${signed(bestDriver.impact)}`);
  }
  if (best && best.key !== current.key) {
    parts.push(
      `your strongest month in range is ${best.label} at ${pct(best.netMarginPct, 1)}, ` +
        `${pct(Math.abs(best.netMarginPct - current.netMarginPct), 1)} above today`,
    );
  }

  return {
    text: head,
    detail: parts.length ? `${parts.join("; ")}.` : undefined,
    tone: delta < 0 ? "bad" : "good",
  };
}

/* ============================================================================
 * Per-chart insights
 * ==========================================================================*/

/** Cost stack against revenue, plus net profit. */
export function performanceInsight(months: MonthFigures[], comparison: MonthFigures): Insight {
  if (months.length < 2) return { text: "Not enough months in range to show a trend.", tone: "neutral" };
  const last = months[months.length - 1];
  const first = months[0];
  const revGrowth = changePct(last.totalRevenue, first.totalRevenue);
  const marginShift = last.netMarginPct - first.netMarginPct;
  const costShare = ((last.totalRevenue - last.netProfit) / last.totalRevenue) * 100;

  const biggest = [
    { label: "COGS", v: last.cogs },
    { label: "marketing", v: last.totalMarketing },
    { label: "operations", v: last.totalOperationalCosts },
  ].sort((a, b) => b.v - a.v)[0];

  return {
    text:
      `Revenue is ${revGrowth >= 0 ? "up" : "down"} ${pct(Math.abs(revGrowth))} across these ` +
      `${months.length} months while net margin moved ${marginShift >= 0 ? "up" : "down"} ` +
      `${pct(Math.abs(marginShift), 1)} to ${pct(last.netMarginPct, 2)}.`,
    detail:
      `Costs now take ${pct(costShare)} of every rupee earned, and ${biggest.label} is the ` +
      `largest block at ${moneyCompact(biggest.v)}. Against ${comparison.label}, net profit is ` +
      `${signed(last.netProfit - comparison.netProfit)}.`,
    tone: marginShift >= 0 ? "good" : "bad",
  };
}

/** Where each rupee of revenue goes. */
export function rupeeRulerInsight(current: MonthFigures, comparison: MonthFigures): Insight {
  const costShare = ((current.totalRevenue - current.netProfit) / current.totalRevenue) * 100;
  const lines = [
    { label: "COGS", now: current.cogs, was: comparison.cogs },
    { label: "Marketing", now: current.totalMarketing, was: comparison.totalMarketing },
    { label: "Shipping", now: current.shipping, was: comparison.shipping },
    { label: "Fixed cost", now: current.fixedCost, was: comparison.fixedCost },
    { label: "Packaging", now: current.packaging, was: comparison.packaging },
    { label: "Transaction fees", now: current.transactionFees, was: comparison.transactionFees },
  ].map((l) => ({
    ...l,
    shareNow: (l.now / current.totalRevenue) * 100,
    shareWas: (l.was / comparison.totalRevenue) * 100,
  }));

  const grew = [...lines].sort((a, b) => b.shareNow - b.shareWas - (a.shareNow - a.shareWas))[0];
  const shift = grew.shareNow - grew.shareWas;

  return {
    text:
      costShare > 100
        ? `Costs consume ${pct(costShare)} of revenue, which is ${pct(costShare - 100)} more than comes in.`
        : `Costs consume ${pct(costShare)} of revenue, leaving ${pct(current.netMarginPct, 2)} as profit.`,
    detail:
      `${grew.label} took the biggest bite at ${pct(grew.shareNow)} of revenue ` +
      `(${money(grew.now)}), ${shift >= 0 ? "up" : "down"} ${pct(Math.abs(shift), 1)} from ` +
      `${comparison.label}.`,
    tone: costShare > 100 ? "bad" : "good",
  };
}

/** Revenue down to net profit for a single month. */
export function profitBridgeInsight(current: MonthFigures): Insight {
  const steps = [
    { label: "COGS", v: current.cogs },
    { label: "operations", v: current.totalOperationalCosts },
    { label: "marketing", v: current.totalMarketing },
  ].sort((a, b) => b.v - a.v);
  const biggest = steps[0];

  return {
    text:
      `${moneyCompact(current.totalRevenue)} of revenue becomes ${money(current.netProfit)} ` +
      `after ${moneyCompact(current.totalRevenue - current.netProfit)} of cost.`,
    detail:
      `${biggest.label[0].toUpperCase()}${biggest.label.slice(1)} is the single largest deduction at ` +
      `${moneyCompact(biggest.v)} (${pct((biggest.v / current.totalRevenue) * 100)} of revenue). ` +
      `Gross margin is ${pct(current.grossMarginPct)}, but fixed cost of ` +
      `${moneyCompact(current.fixedCost)} absorbs ${money(current.fixedPerOrder)} of every order.`,
    tone: current.netProfit >= 0 ? "good" : "bad",
  };
}

/** Twelve-month profit and margin. */
export function trendInsight(months: MonthFigures[], best: MonthFigures): Insight {
  if (!months.length) return { text: "No months in range.", tone: "neutral" };
  const last = months[months.length - 1];
  const profitable = months.filter((m) => m.netProfit > 0).length;
  const first = months[0];
  const slide = last.netMarginPct - first.netMarginPct;

  return {
    text:
      `${profitable} of ${months.length} months in range were profitable, and margin has moved ` +
      `${slide >= 0 ? "up" : "down"} ${pct(Math.abs(slide), 1)} from ${first.shortLabel} to ${last.shortLabel}.`,
    detail:
      `Best month is ${best.label} at ${pct(best.netMarginPct, 1)} and ${money(best.netProfit)}. ` +
      `${last.label} sits ${money(Math.abs(best.netProfit - last.netProfit))} below that, mainly because ` +
      `CAC moved from ${money(best.cac)} to ${money(last.cac)} an order.`,
    tone: slide >= 0 ? "good" : "bad",
  };
}

/** Month-to-date pacing and the projection to close. */
export function projectionInsight(
  current: MonthFigures,
  mtd: number,
  projected: number,
  band: number,
  day: number,
  daysInMonth: number,
): Insight {
  const gap = -projected;
  return {
    text:
      `${day} days in, ${money(mtd)} is booked and the month is tracking to close at ` +
      `${money(projected)}, give or take ${money(band)}.`,
    detail:
      projected < 0
        ? `Break-even needs ${money(gap)} more, which is ${money(gap / current.orders)} per order ` +
          `across ${num(current.orders)} orders, or ${num(Math.ceil(gap / Math.max(current.contributionPerOrder, 1)))} ` +
          `extra orders at today's contribution of ${money(current.contributionPerOrder)}.`
        : `That is ${pct((projected / current.totalRevenue) * 100, 2)} of revenue, with ` +
          `${daysInMonth - day} days still to trade.`,
    tone: projected >= 0 ? "good" : "bad",
  };
}

/** Break-even ROAS against what is actually running. */
export function breakEvenInsight(current: MonthFigures): Insight {
  const gap = current.breakEvenRoas - current.roas;
  return {
    text:
      gap > 0
        ? `Ad spend is returning ${current.roas.toFixed(2)}x when this cost base needs ${current.breakEvenRoas.toFixed(2)}x to break even.`
        : `Ad spend is returning ${current.roas.toFixed(2)}x against a break-even of ${current.breakEvenRoas.toFixed(2)}x, so the month clears its costs.`,
    detail:
      `Each order contributes ${money(current.contributionPerOrder)} before overhead, and fixed cost ` +
      `takes ${money(current.fixedPerOrder)} of that. CAC would need to be ` +
      `${money(current.breakEvenCac)} rather than ${money(current.cac)} for the month to land at zero.`,
    tone: gap > 0 ? "bad" : "good",
  };
}

/** Profit flow from gross revenue to what is left. */
export function sankeyInsight(current: MonthFigures): Insight {
  const returnsShare = (current.returnsAndDiscounts / current.grossRevenue) * 100;
  const biggest = [
    { label: "COGS", v: current.cogs },
    { label: "Ad spend", v: current.totalMarketing },
    { label: "Fixed cost", v: current.fixedCost },
    { label: "Shipping", v: current.shipping },
  ].sort((a, b) => b.v - a.v)[0];

  return {
    text:
      `${moneyCompact(current.grossRevenue)} of gross revenue narrows to ` +
      `${moneyCompact(current.totalRevenue)} after ${pct(returnsShare)} lost to returns and discounts.`,
    detail:
      `${biggest.label} is the widest outflow at ${moneyCompact(biggest.v)}, ` +
      `${pct((biggest.v / current.totalRevenue) * 100)} of net revenue. ` +
      (current.netProfit < 0
        ? `Outflows exceed revenue by ${money(Math.abs(current.netProfit))}.`
        : `${money(current.netProfit)} survives to the bottom line.`),
    tone: current.netProfit >= 0 ? "good" : "bad",
  };
}

/** Per-order economics. */
export function perOrderInsight(current: MonthFigures, comparison: MonthFigures): Insight {
  const contribDelta = current.contributionPerOrder - comparison.contributionPerOrder;
  const netPerOrder = current.netProfit / current.orders;
  return {
    text:
      `A ${money(current.aov)} order keeps ${money(current.contributionPerOrder)} after goods, ` +
      `fulfilment and acquisition, then ${money(current.fixedPerOrder)} of overhead leaves ` +
      `${money(netPerOrder)}.`,
    detail:
      `Acquisition alone takes ${money(current.cac)}, or ${pct((current.cac / current.aov) * 100)} of the order. ` +
      `Contribution is ${signed(contribDelta)} against ${comparison.label}, driven by CAC moving from ` +
      `${money(comparison.cac)} to ${money(current.cac)} and COGS from ${money(comparison.cogsPerOrder)} to ` +
      `${money(current.cogsPerOrder)}.`,
    tone: contribDelta >= 0 ? "good" : "bad",
  };
}

/* ============================================================================
 * SKU-level
 * ==========================================================================*/

export function skuInsight(
  losers: { name: string; totalContribution: number; contributionPerOrder: number; orders: number; cac: number }[],
  totalLoss: number,
  current: MonthFigures,
  totalSkus: number,
): Insight {
  if (!losers.length) {
    return { text: `All ${totalSkus} SKUs are contribution-positive this month.`, tone: "good" };
  }
  const worst = losers[0];
  const lostOrders = losers.reduce((s, l) => s + l.orders, 0);
  return {
    text:
      `${losers.length} of ${totalSkus} SKUs lose money on every sale, together costing ` +
      `${money(Math.abs(totalLoss))} this month.`,
    detail:
      `${worst.name} is the worst at ${money(worst.contributionPerOrder)} per order across ` +
      `${num(worst.orders)} orders (${money(worst.totalContribution)} total), with a CAC of ` +
      `${money(worst.cac)} against a ${money(current.aov)} average order. Fixing these alone would ` +
      `move the month by ${money(Math.abs(totalLoss))}.`,
    tone: "bad",
  };
}

export function heatmapInsight(
  rows: { name: string; grossMarginPct: number; returnRate: number; cac: number; totalContribution: number }[],
): Insight {
  if (!rows.length) return { text: "No SKUs in range.", tone: "neutral" };
  const worstReturn = [...rows].sort((a, b) => b.returnRate - a.returnRate)[0];
  const worstCac = [...rows].sort((a, b) => b.cac - a.cac)[0];
  const bestMargin = [...rows].sort((a, b) => b.grossMarginPct - a.grossMarginPct)[0];
  return {
    text:
      `Gross margin ranges from ${pct(Math.min(...rows.map((r) => r.grossMarginPct)))} to ` +
      `${pct(bestMargin.grossMarginPct)} across the catalogue, so the blend hides a wide spread.`,
    detail:
      `${worstCac.name} carries the heaviest acquisition cost at ${money(worstCac.cac)}, and ` +
      `${worstReturn.name} returns at ${pct(worstReturn.returnRate)}. Those two levers explain most of ` +
      `the red in this table.`,
    tone: "neutral",
  };
}

/* ============================================================================
 * Period comparisons
 * ==========================================================================*/

export function momInsight(current: MonthFigures, comparison: MonthFigures): Insight {
  const drivers = attributeChange(comparison, current);
  const worst = drivers.filter((d) => d.impact < 0)[0];
  const revDelta = changePct(current.totalRevenue, comparison.totalRevenue);
  const profitDelta = current.netProfit - comparison.netProfit;

  return {
    text:
      `Revenue is ${revDelta >= 0 ? "up" : "down"} ${pct(Math.abs(revDelta))} on ${comparison.label} ` +
      `but net profit is ${signed(profitDelta)}.`,
    detail: worst
      ? `${worst.label} accounts for ${money(Math.abs(worst.impact))} of the shortfall: ${worst.detail}.`
      : `Every driver moved in your favour this period.`,
    tone: profitDelta >= 0 ? "good" : "bad",
  };
}

export function qoqInsight(quarters: QuarterFigures[]): Insight {
  if (quarters.length < 2) {
    return { text: "Widen the date range to compare two quarters.", tone: "neutral" };
  }
  const last = quarters[quarters.length - 1];
  const prev = quarters[quarters.length - 2];

  // A part-finished quarter has fewer months in it, so comparing totals would
  // read as a collapse in revenue. Compare the monthly run rate instead and
  // say that is what is being compared.
  const uneven = last.months.length !== prev.months.length;
  const perMonth = (q: QuarterFigures, v: number) => v / q.months.length;

  const revNow = uneven ? perMonth(last, last.totalRevenue) : last.totalRevenue;
  const revWas = uneven ? perMonth(prev, prev.totalRevenue) : prev.totalRevenue;
  const revDelta = changePct(revNow, revWas);

  const marginShift = last.netMarginPct - prev.netMarginPct;
  const cacShift = changePct(last.cac, prev.cac);
  const profitNow = uneven ? perMonth(last, last.netProfit) : last.netProfit;
  const profitWas = uneven ? perMonth(prev, prev.netProfit) : prev.netProfit;

  return {
    text:
      `${last.label} ${uneven ? "is running at" : "revenue is"} ${moneyCompact(revNow)}` +
      `${uneven ? " a month" : ""}, ${revDelta >= 0 ? "up" : "down"} ${pct(Math.abs(revDelta))} on ` +
      `${prev.label}, with margin ${marginShift >= 0 ? "up" : "down"} ${pct(Math.abs(marginShift), 1)} ` +
      `to ${pct(last.netMarginPct, 2)}.`,
    detail:
      (uneven
        ? `${last.label} covers ${last.months.length} of 3 months so far, so this compares monthly run rates rather than totals. `
        : "") +
      `Acquisition cost moved ${cacShift >= 0 ? "up" : "down"} ${pct(Math.abs(cacShift))} to ` +
      `${money(last.cac)} an order, and COGS is ${pct((last.cogs / last.totalRevenue) * 100)} of revenue ` +
      `against ${pct((prev.cogs / prev.totalRevenue) * 100)} the quarter before. Net profit is ` +
      `${signed(profitNow - profitWas)}${uneven ? " a month" : ""}.`,
    tone: marginShift >= 0 ? "good" : "bad",
  };
}

export function benchmarkInsight(current: MonthFigures): Insight {
  return {
    text:
      `Your gross margin of ${pct(current.grossMarginPct)} is healthy, but a ${money(current.cac)} CAC ` +
      `on a ${money(current.aov)} order is what decides the month.`,
    detail:
      `Acquisition takes ${pct((current.cac / current.aov) * 100)} of every order. Bringing CAC to ` +
      `${money(current.breakEvenCac)} would put the month at break-even.`,
    tone: current.netProfit >= 0 ? "good" : "bad",
  };
}
