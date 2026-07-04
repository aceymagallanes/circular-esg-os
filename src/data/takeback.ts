import type { DispositionKey, RegionKey } from "./types";
import { DATASET } from "./dataset";
import { DISPOSITION_META } from "./palette";

export type Stage = "requested" | "collected" | "triage" | "graded" | "dispositioned";
export type Grade = "A" | "B" | "C" | "D";

export interface TakeBackRequest {
  id: string;
  createdDaysAgo: number;
  region: RegionKey;
  regionName: string;
  modelId: string;
  modelName: string;
  category: string;
  units: number;
  grade: Grade;
  ageYears: number;
  stage: Stage;
  slaDays: number;
  ageInStageDays: number;
  onTime: boolean;
  aiDisposition: DispositionKey;
  confidence: number;
  autoRoutable: boolean;
  rationale: string;
  estValueUsd: number;
  estCo2eKg: number;
  source: string;
}

export const STAGES: { key: Stage; label: string; color: string; sla: number; desc: string }[] = [
  { key: "requested", label: "EOL Requested", color: "#6C5CE0", sla: 5, desc: "Customer logged a take-back request" },
  { key: "collected", label: "Collected", color: "#0096D6", sla: 7, desc: "Assets picked up & in transit to hub" },
  { key: "triage", label: "In Triage", color: "#E08A2B", sla: 6, desc: "Inbound audit, data wipe, condition capture" },
  { key: "graded", label: "Graded", color: "#0E6C77", sla: 4, desc: "Cosmetic + functional grade assigned" },
  { key: "dispositioned", label: "Dispositioned", color: "#2FA37A", sla: 5, desc: "Routed to reuse / refurbish / harvest / recycle" },
];

const SOURCES: Record<RegionKey, string[]> = {
  GCR: ["Lenovo Group", "China Mobile", "Ping An Tech", "Alibaba Cloud"],
  JPN: ["SoftBank Corp", "KDDI", "Rakuten Group", "NTT Data"],
  KOR: ["Samsung SDS", "SK Telecom", "Hyundai AutoEver", "LG CNS"],
  SEA: ["DBS Bank", "Grab Holdings", "Sea Ltd", "Singtel"],
  IND: ["Tata Consultancy", "Infosys", "Reliance Jio", "HDFC Bank"],
  ANZ: ["Westpac", "Telstra", "NAB", "Woolworths Group"],
};

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick<T>(arr: T[], r: number): T {
  return arr[Math.floor(r * arr.length) % arr.length];
}

function gradeFor(r: number): Grade {
  if (r < 0.24) return "A";
  if (r < 0.56) return "B";
  if (r < 0.83) return "C";
  return "D";
}

function stageFor(daysAgo: number, r: number): Stage {
  // newer requests sit earlier in the pipeline, with some jitter
  const jitter = (r - 0.5) * 6;
  const d = daysAgo + jitter;
  if (d < 6) return "requested";
  if (d < 15) return "collected";
  if (d < 24) return "triage";
  if (d < 33) return "graded";
  return "dispositioned";
}

/** Rule-based AI disposition recommender (mirrors the R-ladder logic). */
function recommend(grade: Grade, age: number, reuseAffinity: number) {
  let disp: DispositionKey;
  let confidence: number;
  let rationale: string;
  if (grade === "A" && age < 4.5 && reuseAffinity > 0.5) {
    disp = "reuse";
    confidence = 0.9;
    rationale = `Grade A, ${age.toFixed(1)}y old, high redeploy affinity — fully functional for internal redeployment; highest value retention.`;
  } else if ((grade === "A" || grade === "B") && age < 5.5) {
    disp = "refurbish";
    confidence = 0.82;
    rationale = `Grade ${grade}, ${age.toFixed(1)}y — cosmetically viable and within resale window; certified refurbishment maximises second-life value.`;
  } else if (grade === "C") {
    disp = "harvest";
    confidence = 0.71;
    rationale = `Grade C — below resale threshold but component-viable; harvest tested spares (SSD/RAM/panels) before material recovery.`;
  } else {
    disp = "recycle";
    confidence = 0.86;
    rationale = `Grade ${grade}, ${age.toFixed(1)}y — not economically refurbishable; route to certified shredding for material recovery.`;
  }
  // small age penalty to confidence
  confidence = Math.max(0.55, confidence - Math.max(0, age - 5) * 0.03);
  return { disp, confidence, rationale };
}

function buildRequests(): TakeBackRequest[] {
  const rnd = mulberry32(770077);
  const out: TakeBackRequest[] = [];
  const N = 56;
  const ue = DATASET.meta.unitEconomics;
  for (let i = 0; i < N; i++) {
    const region = pick(DATASET.regions, rnd());
    const model = pick(DATASET.models, rnd());
    const daysAgo = Math.floor(rnd() * 46);
    const grade = gradeFor(rnd());
    const age = Math.max(1.5, model.avgAgeYears + (rnd() - 0.5) * 2.4);
    const units = 20 + Math.floor(rnd() * 480);
    const stage = stageFor(daysAgo, rnd());
    const rec = recommend(grade, age, model.reuseAffinity);
    const stageMeta = STAGES.find((s) => s.key === stage)!;
    const ageInStageDays = Math.floor(rnd() * (stageMeta.sla + 4));
    const onTime = ageInStageDays <= stageMeta.sla;

    // value & emissions estimate by recommended route
    const mass = units * model.avgMassKg;
    let estValueUsd = 0;
    let estCo2eKg = 0;
    if (rec.disp === "reuse") {
      estValueUsd = units * model.residualValueUsd * 0.9;
      estCo2eKg = units * ue.co2ePerReuseKg;
    } else if (rec.disp === "refurbish") {
      estValueUsd = units * model.residualValueUsd;
      estCo2eKg = units * ue.co2ePerRefurbKg;
    } else if (rec.disp === "harvest") {
      estValueUsd = units * model.residualValueUsd * 0.28 + mass * 0.9;
      estCo2eKg = units * ue.co2ePerHarvestKg + (mass / 1000) * ue.co2ePerRecycledTonne * 0.3;
    } else {
      estValueUsd = mass * 1.15;
      estCo2eKg = (mass / 1000) * ue.co2ePerRecycledTonne;
    }

    out.push({
      id: `TB-26-${String(1042 + i)}`,
      createdDaysAgo: daysAgo,
      region: region.id,
      regionName: region.short,
      modelId: model.id,
      modelName: model.name,
      category: model.category,
      units,
      grade,
      ageYears: age,
      stage,
      slaDays: stageMeta.sla,
      ageInStageDays,
      onTime,
      aiDisposition: rec.disp,
      confidence: rec.confidence,
      autoRoutable: rec.confidence >= 0.8,
      rationale: rec.rationale,
      estValueUsd,
      estCo2eKg,
      source: pick(SOURCES[region.id], rnd()),
    });
  }
  return out;
}

export const TAKEBACK_REQUESTS = buildRequests();

export interface TakeBackView {
  requests: TakeBackRequest[];
  byStage: Record<Stage, TakeBackRequest[]>;
  kpis: { openRequests: number; unitsInFlight: number; avgCycleDays: number; onTimePct: number; autoRoutedPct: number; atRisk: number };
  dispositionSplit: { key: DispositionKey; label: string; color: string; units: number; share: number }[];
  copilotContext: Record<string, unknown>;
}

export function buildTakeBackView(regions: RegionKey[] | "all"): TakeBackView {
  const match = (r: RegionKey) => regions === "all" || regions.includes(r);
  const requests = TAKEBACK_REQUESTS.filter((r) => match(r.region));

  const byStage = STAGES.reduce((acc, s) => {
    acc[s.key] = requests.filter((r) => r.stage === s.key);
    return acc;
  }, {} as Record<Stage, TakeBackRequest[]>);

  const open = requests.filter((r) => r.stage !== "dispositioned");
  const unitsInFlight = open.reduce((a, r) => a + r.units, 0);
  const onTimePct = requests.length ? requests.filter((r) => r.onTime).length / requests.length : 0;
  const autoRoutedPct = requests.length ? requests.filter((r) => r.autoRoutable).length / requests.length : 0;
  const avgCycleDays =
    requests.length ? requests.reduce((a, r) => a + Math.min(46, r.createdDaysAgo + 4), 0) / requests.length : 0;
  const atRisk = open.filter((r) => !r.onTime).length;

  const dispUnits: Record<DispositionKey, number> = { reuse: 0, refurbish: 0, harvest: 0, recycle: 0, disposal: 0 };
  requests.forEach((r) => (dispUnits[r.aiDisposition] += r.units));
  const totalUnits = Object.values(dispUnits).reduce((a, b) => a + b, 0) || 1;
  const dispositionSplit = (Object.keys(dispUnits) as DispositionKey[])
    .filter((k) => dispUnits[k] > 0)
    .map((k) => ({
      key: k,
      label: DISPOSITION_META[k].short,
      color: DISPOSITION_META[k].color,
      units: dispUnits[k],
      share: dispUnits[k] / totalUnits,
    }));

  return {
    requests: requests.sort((a, b) => a.createdDaysAgo - b.createdDaysAgo),
    byStage,
    kpis: {
      openRequests: open.length,
      unitsInFlight,
      avgCycleDays,
      onTimePct,
      autoRoutedPct,
      atRisk,
    },
    dispositionSplit,
    copilotContext: {
      module: "Smart Product Take-Back Workflow",
      geography: "APJ is one region containing six markets (Greater China, Japan, South Korea, India, Southeast Asia/ASEAN, Australia & New Zealand). Refer to them as markets, not regions.",
      marketScope: regions === "all" ? "All six APJ markets" : regions,
      openRequests: open.length,
      unitsInFlight,
      onTimeSLApct: +(onTimePct * 100).toFixed(1),
      autoRoutedByAIpct: +(autoRoutedPct * 100).toFixed(1),
      atRiskRequests: atRisk,
      pipelineByStage: STAGES.map((s) => ({ stage: s.label, count: byStage[s.key].length, units: byStage[s.key].reduce((a, r) => a + r.units, 0) })),
      aiRecommendedDispositionUnits: dispositionSplit.map((d) => ({ route: d.label, units: Math.round(d.units), sharePct: +(d.share * 100).toFixed(1) })),
    },
  };
}
