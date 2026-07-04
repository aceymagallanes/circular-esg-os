import type {
  AnomalyPoint,
  CohortCell,
  ControlTowerView,
  Dataset,
  DispositionKey,
  DispositionDatum,
  Filters,
  ForecastPoint,
  Kpi,
  MaterialKey,
  RegionKey,
  SankeyGraph,
  WaterfallStep,
} from "./types";
import { DISPOSITION_META, DISPOSITION_ORDER, MATERIAL_META, MATERIAL_ORDER } from "./palette";
import { HUB_XY } from "./generate";

const CATEGORY_COLOR: Record<string, string> = {
  Laptop: "#123B47",
  Desktop: "#1C5A67",
  Workstation: "#2C7C88",
  Display: "#3E8E86",
  Printer: "#5C6E76",
  Accessory: "#7C8A90",
};

const AGE_BANDS = ["< 3 yrs", "3–4 yrs", "4–5 yrs", "5–6 yrs", "6 yrs +"];
const AGE_MID = [2.5, 3.5, 4.5, 5.5, 6.8];

interface MonthAgg {
  m: number;
  label: string;
  units: number;
  dispUnits: Record<DispositionKey, number>;
  materialKg: number;
  materialsByKey: Record<MaterialKey, number>;
  co2eT: number;
  valueUsd: number;
  evidence: number;
}

function emptyDisp(): Record<DispositionKey, number> {
  return { reuse: 0, refurbish: 0, harvest: 0, recycle: 0, disposal: 0 };
}
function emptyMat(): Record<MaterialKey, number> {
  return { aluminum: 0, steel: 0, copper: 0, plastics: 0, glass: 0, gold: 0, ree: 0, cobalt: 0, board: 0 };
}

function normPdf(x: number, mu: number, sigma: number) {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z);
}

function regionMatch(filters: Filters, region: RegionKey): boolean {
  return filters.regions === "all" || filters.regions.includes(region);
}

/** Per-month aggregate across all 24 months, region-filtered. */
function monthlyAgg(ds: Dataset, filters: Filters): MonthAgg[] {
  const ue = ds.meta.unitEconomics;
  const modelById = new Map(ds.models.map((m) => [m.id, m]));
  const aggs: MonthAgg[] = ds.months.map((mo) => ({
    m: mo.index,
    label: mo.label,
    units: 0,
    dispUnits: emptyDisp(),
    materialKg: 0,
    materialsByKey: emptyMat(),
    co2eT: 0,
    valueUsd: 0,
    evidence: 0,
  }));

  for (const row of ds.rows) {
    if (!regionMatch(filters, row.region)) continue;
    const model = modelById.get(row.model)!;
    const a = aggs[row.m];
    a.units += row.units;

    const u: Record<DispositionKey, number> = {
      reuse: row.units * row.disp.reuse,
      refurbish: row.units * row.disp.refurbish,
      harvest: row.units * row.disp.harvest,
      recycle: row.units * row.disp.recycle,
      disposal: row.units * row.disp.disposal,
    };
    (Object.keys(u) as DispositionKey[]).forEach((k) => (a.dispUnits[k] += u[k]));

    // mass entering material streams: full recycle mass + residual from harvested units
    const massIn = (u.recycle + u.harvest * 0.35) * model.avgMassKg;
    let matTonnesThisRow = 0;
    (Object.keys(model.composition) as MaterialKey[]).forEach((mk) => {
      const kg = massIn * model.composition[mk] * ue.recoveryEfficiency[mk];
      a.materialsByKey[mk] += kg;
      a.materialKg += kg;
      matTonnesThisRow += kg / 1000;
      a.valueUsd += kg * ue.materialValuePerKg[mk];
    });

    // avoided emissions
    a.co2eT +=
      (u.reuse * ue.co2ePerReuseKg +
        u.refurbish * ue.co2ePerRefurbKg +
        u.harvest * ue.co2ePerHarvestKg) /
        1000 +
      matTonnesThisRow * ue.co2ePerRecycledTonne / 1000;

    // recovered financial value (resale + redeploy avoided-cost; materials added above)
    a.valueUsd += u.refurbish * model.residualValueUsd + u.reuse * model.residualValueUsd * 0.6;
  }

  // evidence coverage improves over time (Evidence Vault readiness)
  aggs.forEach((a, i) => {
    a.evidence = 0.9 + 0.075 * (i / (aggs.length - 1)) + (i % 3 === 0 ? 0.004 : 0);
  });

  return aggs;
}

function sum(list: number[]): number {
  return list.reduce((a, b) => a + b, 0);
}

function windowIndices(total: number, back: number): { cur: number[]; prev: number[] } {
  const b = Math.min(back, total);
  const cur: number[] = [];
  for (let i = total - b; i < total; i++) cur.push(i);
  const prev: number[] = [];
  for (let i = Math.max(0, total - 2 * b); i < total - b; i++) prev.push(i);
  return { cur, prev };
}

function circularityOf(d: Record<DispositionKey, number>): number {
  const t = d.reuse + d.refurbish + d.harvest + d.recycle + d.disposal;
  if (!t) return 0;
  return (d.reuse + d.refurbish + d.harvest) / t;
}
function diversionOf(d: Record<DispositionKey, number>): number {
  const t = d.reuse + d.refurbish + d.harvest + d.recycle + d.disposal;
  if (!t) return 0;
  return 1 - d.disposal / t;
}

function fmtWindow(months: number): string {
  if (months >= 24) return "Trailing 24 months";
  if (months === 12) return "Trailing 12 months";
  if (months === 6) return "Trailing 6 months";
  if (months === 3) return "Trailing quarter";
  return `Trailing ${months} months`;
}

// ── main aggregation ───────────────────────────────────────────────────────
export function buildView(ds: Dataset, filters: Filters): ControlTowerView {
  const agg = monthlyAgg(ds, filters);
  const total = agg.length;
  const { cur, prev } = windowIndices(total, filters.monthsBack);
  const curAgg = cur.map((i) => agg[i]);
  const prevAgg = prev.map((i) => agg[i]);

  // window disposition totals
  const curDisp = emptyDisp();
  const prevDisp = emptyDisp();
  curAgg.forEach((a) => DISPOSITION_ORDER.forEach((k) => (curDisp[k] += a.dispUnits[k])));
  prevAgg.forEach((a) => DISPOSITION_ORDER.forEach((k) => (prevDisp[k] += a.dispUnits[k])));

  const curUnits = sum(curAgg.map((a) => a.units));
  const prevUnits = sum(prevAgg.map((a) => a.units)) || 1;
  const curMatKg = sum(curAgg.map((a) => a.materialKg));
  const prevMatKg = sum(prevAgg.map((a) => a.materialKg)) || 1;
  const curCo2 = sum(curAgg.map((a) => a.co2eT));
  const prevCo2 = sum(prevAgg.map((a) => a.co2eT)) || 1;
  const curValue = sum(curAgg.map((a) => a.valueUsd));
  const prevValue = sum(prevAgg.map((a) => a.valueUsd)) || 1;

  const curCirc = circularityOf(curDisp);
  const prevCirc = circularityOf(prevDisp);
  const curDiv = diversionOf(curDisp);
  const prevDiv = diversionOf(prevDisp);
  const evidence = curAgg.length ? curAgg[curAgg.length - 1].evidence : 0.95;

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const refurbSharePct = (curDisp.refurbish / (curUnits || 1)) * 100;
  const scopeLabel = filters.regions === "all" ? "all six APJ markets" : `${(filters.regions as string[]).length} selected markets`;
  const kpis: Kpi[] = [
    {
      key: "units", label: "Assets recovered", unit: "units", value: curUnits, prev: prevUnits,
      deltaPct: ((curUnits - prevUnits) / prevUnits) * 100,
      spark: curAgg.map((a) => a.units), goodIsUp: true, format: "int",
      caption: `Averaging ${(curUnits / (cur.length || 1) / 1000).toFixed(1)}K assets recovered per month across ${scopeLabel}.`,
    },
    {
      key: "circularity", label: "Circularity rate", unit: "", value: curCirc, prev: prevCirc,
      deltaPct: (curCirc - prevCirc) * 100,
      spark: curAgg.map((a) => circularityOf(a.dispUnits)), goodIsUp: true, format: "pct",
      caption: `Assets retained as products or components; refurbishment leads at ${refurbSharePct.toFixed(0)}% of intake.`,
    },
    {
      key: "diversion", label: "Landfill diversion", unit: "", value: curDiv, prev: prevDiv,
      deltaPct: (curDiv - prevDiv) * 100,
      spark: curAgg.map((a) => diversionOf(a.dispUnits)), goodIsUp: true, format: "pct",
      caption: `Only ${((1 - curDiv) * 100).toFixed(1)}% is sent to responsible disposal — the non-recoverable residual.`,
    },
    {
      key: "materials", label: "Materials recovered", unit: "t", value: curMatKg / 1000, prev: prevMatKg / 1000,
      deltaPct: ((curMatKg - prevMatKg) / prevMatKg) * 100,
      spark: curAgg.map((a) => a.materialKg / 1000), goodIsUp: true, format: "tonne",
      caption: `Certified secondary materials returned to supply, net of processing losses.`,
    },
    {
      key: "co2e", label: "CO₂e avoided", unit: "t", value: curCo2, prev: prevCo2,
      deltaPct: ((curCo2 - prevCo2) / prevCo2) * 100,
      spark: curAgg.map((a) => a.co2eT), goodIsUp: true, format: "tonne",
      caption: `Avoided virgin extraction and new manufacturing; per GRI 305 and ESRS E5.`,
    },
    {
      key: "value", label: "Recovered value", unit: "USD", value: curValue, prev: prevValue,
      deltaPct: ((curValue - prevValue) / prevValue) * 100,
      spark: curAgg.map((a) => a.valueUsd), goodIsUp: true, format: "usd",
      caption: `Resale, redeployment avoided-cost and recovered-material revenue combined.`,
    },
  ];

  // ── disposition mix ────────────────────────────────────────────────────────
  const dispositions: DispositionDatum[] = DISPOSITION_ORDER.map((k) => ({
    key: k,
    label: DISPOSITION_META[k].label,
    units: curDisp[k],
    share: curDisp[k] / (curUnits || 1),
    color: DISPOSITION_META[k].color,
  }));

  // ── window rows for detailed breakdowns ────────────────────────────────────
  const modelById = new Map(ds.models.map((m) => [m.id, m]));
  const curSet = new Set(cur);
  const ue = ds.meta.unitEconomics;

  // category → disposition units; disposition(recycle/harvest) → material kg
  const catDisp = new Map<string, Record<DispositionKey, number>>();
  const dispMaterial: Record<"recycle" | "harvest", Record<MaterialKey, number>> = {
    recycle: emptyMat(),
    harvest: emptyMat(),
  };
  const materialsByKey = emptyMat();
  const modelUnits = new Map<string, number>();
  const modelCirc = new Map<string, { circ: number; units: number }>();
  const regionUnits = new Map<RegionKey, { units: number; disp: Record<DispositionKey, number> }>();

  for (const row of ds.rows) {
    if (!curSet.has(row.m) || !regionMatch(filters, row.region)) continue;
    const model = modelById.get(row.model)!;
    const cat = model.category;
    if (!catDisp.has(cat)) catDisp.set(cat, emptyDisp());
    const cd = catDisp.get(cat)!;
    const u: Record<DispositionKey, number> = {
      reuse: row.units * row.disp.reuse,
      refurbish: row.units * row.disp.refurbish,
      harvest: row.units * row.disp.harvest,
      recycle: row.units * row.disp.recycle,
      disposal: row.units * row.disp.disposal,
    };
    DISPOSITION_ORDER.forEach((k) => (cd[k] += u[k]));

    // materials from recycle (full) and harvest (residual)
    (Object.keys(model.composition) as MaterialKey[]).forEach((mk) => {
      const kgRecycle = u.recycle * model.avgMassKg * model.composition[mk] * ue.recoveryEfficiency[mk];
      const kgHarvest = u.harvest * 0.35 * model.avgMassKg * model.composition[mk] * ue.recoveryEfficiency[mk];
      dispMaterial.recycle[mk] += kgRecycle;
      dispMaterial.harvest[mk] += kgHarvest;
      materialsByKey[mk] += kgRecycle + kgHarvest;
    });

    modelUnits.set(row.model, (modelUnits.get(row.model) || 0) + row.units);
    const mc = modelCirc.get(row.model) || { circ: 0, units: 0 };
    mc.circ += (u.reuse + u.refurbish + u.harvest);
    mc.units += row.units;
    modelCirc.set(row.model, mc);

    const ru = regionUnits.get(row.region) || { units: 0, disp: emptyDisp() };
    ru.units += row.units;
    DISPOSITION_ORDER.forEach((k) => (ru.disp[k] += u[k]));
    regionUnits.set(row.region, ru);
  }

  // ── Sankey graph: category → disposition → material ────────────────────────
  const sankey: SankeyGraph = { nodes: [], links: [] };
  const seen = new Set<string>();
  const addNode = (id: string, label: string, kind: "category" | "disposition" | "material", color: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    sankey.nodes.push({ id, label, kind, color });
  };
  // categories
  [...catDisp.keys()].forEach((cat) => addNode(`cat:${cat}`, cat, "category", CATEGORY_COLOR[cat] || "#3E5B63"));
  // dispositions
  DISPOSITION_ORDER.forEach((k) => addNode(`disp:${k}`, DISPOSITION_META[k].short, "disposition", DISPOSITION_META[k].color));
  // category → disposition links
  catDisp.forEach((cd, cat) => {
    DISPOSITION_ORDER.forEach((k) => {
      if (cd[k] > 0) sankey.links.push({ source: `cat:${cat}`, target: `disp:${k}`, value: cd[k] });
    });
  });
  // disposition(recycle/harvest) → material links (top materials only, for legibility)
  const topMats = MATERIAL_ORDER
    .map((mk) => ({ mk, kg: materialsByKey[mk] }))
    .sort((a, b) => b.kg - a.kg)
    .slice(0, 6)
    .map((x) => x.mk);
  topMats.forEach((mk) => addNode(`mat:${mk}`, MATERIAL_META[mk].short, "material", MATERIAL_META[mk].color));
  (["recycle", "harvest"] as const).forEach((dk) => {
    topMats.forEach((mk) => {
      const kg = dispMaterial[dk][mk];
      if (kg > 0) sankey.links.push({ source: `disp:${dk}`, target: `mat:${mk}`, value: kg });
    });
  });

  // ── materials list ─────────────────────────────────────────────────────────
  const materials = MATERIAL_ORDER.map((mk) => ({
    key: mk,
    label: MATERIAL_META[mk].label,
    kg: materialsByKey[mk],
    valueUsd: materialsByKey[mk] * ue.materialValuePerKg[mk],
    color: MATERIAL_META[mk].color,
  })).sort((a, b) => b.valueUsd - a.valueUsd);

  // ── circularity forecast (linear trend + residual band, +6 months) ─────────
  const circSeries = agg.map((a) => circularityOf(a.dispUnits));
  const circularityForecast = forecast(agg.map((a) => a.label), circSeries, 6);

  // ── emissions waterfall (window, tonnes) ───────────────────────────────────
  const reuseT = (curDisp.reuse * ue.co2ePerReuseKg) / 1000;
  const refurbT = (curDisp.refurbish * ue.co2ePerRefurbKg) / 1000;
  const harvestT = (curDisp.harvest * ue.co2ePerHarvestKg) / 1000;
  const recycleT = (curMatKg / 1000) * ue.co2ePerRecycledTonne / 1000;
  // leakage: emissions that would have been avoided had disposed units been recovered
  const leakageT = (curDisp.disposal * ue.co2ePerRefurbKg * 0.4) / 1000;
  const netT = reuseT + refurbT + harvestT + recycleT - leakageT;
  const emissionsWaterfall: WaterfallStep[] = [
    { key: "reuse", label: "Reuse", value: reuseT, kind: "increase", color: DISPOSITION_META.reuse.color },
    { key: "refurbish", label: "Refurbish", value: refurbT, kind: "increase", color: DISPOSITION_META.refurbish.color },
    { key: "harvest", label: "Harvest", value: harvestT, kind: "increase", color: DISPOSITION_META.harvest.color },
    { key: "recycle", label: "Recycle", value: recycleT, kind: "increase", color: DISPOSITION_META.recycle.color },
    { key: "leakage", label: "Disposal leakage", value: -leakageT, kind: "decrease", color: "#C24A44" },
    { key: "net", label: "Net avoided", value: netT, kind: "total", color: "#0B1E27" },
  ];

  // ── cohort matrix: model × age band, yield = second-life probability ────────
  const cohortModels = [...modelUnits.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id]) => id);
  const cells: CohortCell[] = [];
  cohortModels.forEach((id) => {
    const model = modelById.get(id)!;
    const mc = modelCirc.get(id)!;
    const baseCirc = mc.units ? mc.circ / mc.units : 0;
    const units = modelUnits.get(id) || 0;
    const weights = AGE_MID.map((mid) => normPdf(mid, model.avgAgeYears, 1.15));
    const wSum = sum(weights) || 1;
    AGE_BANDS.forEach((band, bi) => {
      const w = weights[bi] / wSum;
      const ageMult = Math.max(0.42, Math.min(1.32, 1 + (model.avgAgeYears - AGE_MID[bi]) * 0.1));
      cells.push({
        model: id,
        modelName: model.name,
        ageBand: band,
        units: units * w,
        yield: Math.max(0.05, Math.min(0.97, baseCirc * ageMult)),
      });
    });
  });

  // ── anomaly scan on landfill diversion (region-filtered monthly series) ─────
  const divSeries = agg.map((a) => diversionOf(a.dispUnits));
  const mean = sum(divSeries) / (divSeries.length || 1);
  const sd = Math.sqrt(sum(divSeries.map((v) => (v - mean) ** 2)) / (divSeries.length || 1)) || 1e-6;
  const anomalyPoints: AnomalyPoint[] = agg.map((a, i) => {
    const v = divSeries[i];
    const z = (v - mean) / sd;
    return { index: a.m, label: a.label, value: v, z, isAnomaly: Math.abs(z) > 2, mean, band: 2 * sd };
  });

  // ── network flows region → hub ─────────────────────────────────────────────
  const networkFlows = ds.regions
    .filter((r) => regionMatch(filters, r.id))
    .map((r) => {
      const ru = regionUnits.get(r.id) || { units: 0, disp: emptyDisp() };
      const hub = HUB_XY[r.hub];
      return {
        from: { x: r.x, y: r.y, label: r.short },
        to: { x: hub.x, y: hub.y, label: r.hub },
        value: ru.units,
        circularity: circularityOf(ru.disp),
      };
    })
    .filter((f) => f.value > 0);

  // per-region summary for copilot + map tooltips
  const regionSummary = ds.regions
    .filter((r) => regionMatch(filters, r.id))
    .map((r) => {
      const ru = regionUnits.get(r.id) || { units: 0, disp: emptyDisp() };
      return {
        market: r.name,
        units: Math.round(ru.units),
        circularityRate: +circularityOf(ru.disp).toFixed(3),
        diversionRate: +diversionOf(ru.disp).toFixed(3),
      };
    })
    .sort((a, b) => b.units - a.units);

  const fc = circularityForecast.find((p) => p.forecast != null && p.index === total + 5);
  const anomalies = anomalyPoints.filter((p) => p.isAnomaly).map((p) => ({ month: p.label, diversion: +p.value.toFixed(3), z: +p.z.toFixed(2) }));

  const view: ControlTowerView = {
    filters,
    windowLabel: fmtWindow(filters.monthsBack),
    kpis,
    dispositions,
    sankey,
    materials,
    circularityForecast,
    emissionsWaterfall,
    cohort: {
      models: cohortModels.map((id) => ({ id, name: modelById.get(id)!.name })),
      ageBands: AGE_BANDS,
      cells,
    },
    anomaly: { title: "Landfill diversion — exception monitoring", unit: "%", points: anomalyPoints },
    networkFlows,
    nodes: { regions: ds.regions.filter((r) => regionMatch(filters, r.id)), hubs: ds.hubs },
    headline: {
      totalUnits: curUnits,
      circularityRate: curCirc,
      diversionRate: curDiv,
      materialTonnes: curMatKg / 1000,
      co2eAvoidedTonnes: curCo2,
      recoveryValueUsd: curValue,
      evidenceCoverage: evidence,
    },
    copilotContext: {
      program: ds.meta.program,
      geography: "APJ is one region; it contains six markets (Greater China, Japan, South Korea, India, Southeast Asia/ASEAN, Australia & New Zealand). Refer to the six as markets, not regions.",
      window: fmtWindow(filters.monthsBack),
      marketScope: filters.regions === "all" ? "All six APJ markets" : filters.regions,
      headline: {
        unitsRecovered: Math.round(curUnits),
        circularityRatePct: +(curCirc * 100).toFixed(1),
        landfillDiversionPct: +(curDiv * 100).toFixed(1),
        materialsRecoveredTonnes: +(curMatKg / 1000).toFixed(0),
        co2eAvoidedTonnes: +curCo2.toFixed(0),
        recoveryValueUsd: Math.round(curValue),
        evidenceCoveragePct: +(evidence * 100).toFixed(1),
      },
      vsPriorPeriod: {
        circularityPointsDelta: +((curCirc - prevCirc) * 100).toFixed(2),
        diversionPointsDelta: +((curDiv - prevDiv) * 100).toFixed(2),
        materialsPctDelta: +(((curMatKg - prevMatKg) / prevMatKg) * 100).toFixed(1),
        valuePctDelta: +(((curValue - prevValue) / prevValue) * 100).toFixed(1),
      },
      dispositionMixPct: DISPOSITION_ORDER.reduce((acc, k) => {
        acc[DISPOSITION_META[k].short] = +((curDisp[k] / (curUnits || 1)) * 100).toFixed(1);
        return acc;
      }, {} as Record<string, number>),
      topMaterialsByValue: materials.slice(0, 5).map((m) => ({
        material: m.label, tonnes: +(m.kg / 1000).toFixed(1), valueUsd: Math.round(m.valueUsd),
      })),
      perMarket: regionSummary,
      circularityForecastNext6mPct: fc ? +((fc.forecast || 0) * 100).toFixed(1) : null,
      anomalies: anomalies.length ? anomalies : "none detected in current scope",
      frameworks: ["GRI 306 (Waste)", "ESRS E5 (Resource use & circular economy)", "ISO 14001"],
    },
  };

  return view;
}

// linear regression + residual-std confidence band, projecting `ahead` months
function forecast(labels: string[], series: number[], ahead: number): ForecastPoint[] {
  const n = series.length;
  const xs = series.map((_, i) => i);
  const mx = sum(xs) / n;
  const my = sum(series) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (series[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den ? num / den : 0;
  const intercept = my - slope * mx;
  const fit = (x: number) => intercept + slope * x;
  const resid = series.map((v, i) => v - fit(i));
  const se = Math.sqrt(sum(resid.map((r) => r * r)) / Math.max(1, n - 2));

  const out: ForecastPoint[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ index: i, label: labels[i], actual: series[i], fitted: fit(i), forecast: null, lo: null, hi: null });
  }
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // continue labels from last known (2026-07 → Aug..)
  for (let k = 1; k <= ahead; k++) {
    const i = n - 1 + k;
    const f = Math.max(0, Math.min(1, fit(i)));
    // band widens with horizon
    const widen = se * 1.96 * Math.sqrt(1 + k / 6);
    const moIdx = (6 + k) % 12; // series ends at July(6)
    const yr = 26 + Math.floor((6 + k) / 12);
    out.push({
      index: i,
      label: `${monthNames[moIdx]} '${yr}`,
      actual: null,
      fitted: null,
      forecast: f,
      lo: Math.max(0, f - widen),
      hi: Math.min(1, f + widen),
    });
  }
  // bridge: last actual point also carries a forecast anchor so the line connects
  out[n - 1].forecast = out[n - 1].actual;
  out[n - 1].lo = out[n - 1].actual;
  out[n - 1].hi = out[n - 1].actual;
  return out;
}
