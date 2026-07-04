import type {
  AtomicRow,
  Dataset,
  DeviceModel,
  DispositionKey,
  HubMeta,
  MaterialKey,
  MonthMeta,
  RegionKey,
  RegionMeta,
} from "./types";

// ── deterministic PRNG so the "data" is stable across reloads ───────────────
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const N_MONTHS = 24;
// Series ends at "current" = 2026-07; 24 trailing months.
const END_YEAR = 2026;
const END_MONTH = 6; // 0-indexed → July

function buildMonths(): MonthMeta[] {
  const out: MonthMeta[] = [];
  for (let i = N_MONTHS - 1; i >= 0; i--) {
    let y = END_YEAR;
    let mo = END_MONTH - i;
    while (mo < 0) {
      mo += 12;
      y -= 1;
    }
    out.push({
      index: N_MONTHS - 1 - i,
      key: `${y}-${String(mo + 1).padStart(2, "0")}`,
      label: `${MONTH_LABELS[mo]} '${String(y).slice(2)}`,
    });
  }
  return out;
}

export const REGIONS: RegionMeta[] = [
  { id: "GCR", name: "Greater China", short: "China", x: 74, y: 34, hub: "Shenzhen Materials Hub", maturity: 0.82 },
  { id: "JPN", name: "Japan", short: "Japan", x: 88, y: 30, hub: "Osaka Recovery Hub", maturity: 0.9 },
  { id: "KOR", name: "South Korea", short: "Korea", x: 83, y: 27, hub: "Osaka Recovery Hub", maturity: 0.86 },
  { id: "SEA", name: "Southeast Asia (ASEAN)", short: "SEA", x: 66, y: 62, hub: "Singapore Recovery Hub", maturity: 0.71 },
  { id: "IND", name: "India", short: "India", x: 45, y: 50, hub: "Singapore Recovery Hub", maturity: 0.63 },
  { id: "ANZ", name: "Australia & New Zealand", short: "ANZ", x: 82, y: 84, hub: "Sydney Recovery Hub", maturity: 0.79 },
];

export const HUBS: HubMeta[] = [
  { id: "shenzhen", name: "Shenzhen Materials Hub", x: 72, y: 44, certification: "R2v3 · ISO 14001" },
  { id: "osaka", name: "Osaka Recovery Hub", x: 90, y: 20, certification: "R2v3 · ISO 14001" },
  { id: "singapore", name: "Singapore Recovery Hub", x: 60, y: 68, certification: "e-Stewards · ISO 14001" },
  { id: "sydney", name: "Sydney Recovery Hub", x: 90, y: 90, certification: "R2v3 · ISO 14001" },
];

const HUB_XY: Record<string, { x: number; y: number }> = {
  "Shenzhen Materials Hub": { x: 72, y: 44 },
  "Osaka Recovery Hub": { x: 90, y: 20 },
  "Singapore Recovery Hub": { x: 60, y: 68 },
  "Sydney Recovery Hub": { x: 90, y: 90 },
};
export { HUB_XY };

// material composition helper (auto-normalized later)
function comp(o: Partial<Record<MaterialKey, number>>): Record<MaterialKey, number> {
  const base: Record<MaterialKey, number> = {
    aluminum: 0, steel: 0, copper: 0, plastics: 0, glass: 0, gold: 0, ree: 0, cobalt: 0, board: 0,
  };
  const merged = { ...base, ...o };
  const sum = Object.values(merged).reduce((a, b) => a + b, 0) || 1;
  (Object.keys(merged) as MaterialKey[]).forEach((k) => (merged[k] = merged[k] / sum));
  return merged;
}

export const MODELS: DeviceModel[] = [
  {
    id: "elitebook-840", name: "EliteBook 840 G-series", category: "Laptop",
    avgMassKg: 1.35, avgAgeYears: 4.4, reuseAffinity: 0.72, residualValueUsd: 285,
    composition: comp({ aluminum: 0.34, steel: 0.06, copper: 0.09, plastics: 0.24, glass: 0.08, gold: 0.00016, ree: 0.0016, cobalt: 0.012, board: 0.16 }),
  },
  {
    id: "probook-450", name: "ProBook 450", category: "Laptop",
    avgMassKg: 1.79, avgAgeYears: 4.9, reuseAffinity: 0.58, residualValueUsd: 190,
    composition: comp({ aluminum: 0.2, steel: 0.1, copper: 0.09, plastics: 0.35, glass: 0.08, gold: 0.00014, ree: 0.0015, cobalt: 0.011, board: 0.14 }),
  },
  {
    id: "spectre-x360", name: "Spectre x360", category: "Laptop",
    avgMassKg: 1.34, avgAgeYears: 3.8, reuseAffinity: 0.79, residualValueUsd: 340,
    composition: comp({ aluminum: 0.4, steel: 0.04, copper: 0.09, plastics: 0.18, glass: 0.09, gold: 0.00018, ree: 0.0017, cobalt: 0.013, board: 0.15 }),
  },
  {
    id: "chromebook-11", name: "Chromebook 11 G-series", category: "Laptop",
    avgMassKg: 1.1, avgAgeYears: 4.1, reuseAffinity: 0.44, residualValueUsd: 95,
    composition: comp({ aluminum: 0.14, steel: 0.08, copper: 0.08, plastics: 0.44, glass: 0.08, gold: 0.0001, ree: 0.0012, cobalt: 0.009, board: 0.14 }),
  },
  {
    id: "z2-workstation", name: "Z2 Tower Workstation", category: "Workstation",
    avgMassKg: 9.8, avgAgeYears: 5.6, reuseAffinity: 0.5, residualValueUsd: 430,
    composition: comp({ aluminum: 0.14, steel: 0.42, copper: 0.12, plastics: 0.13, glass: 0.0, gold: 0.00006, ree: 0.0008, cobalt: 0.0, board: 0.19 }),
  },
  {
    id: "elitedesk-800", name: "EliteDesk 800 SFF", category: "Desktop",
    avgMassKg: 5.4, avgAgeYears: 5.9, reuseAffinity: 0.47, residualValueUsd: 165,
    composition: comp({ aluminum: 0.1, steel: 0.46, copper: 0.11, plastics: 0.15, glass: 0.0, gold: 0.00005, ree: 0.0006, cobalt: 0.0, board: 0.18 }),
  },
  {
    id: "e24-monitor", name: "E24 Display", category: "Display",
    avgMassKg: 4.7, avgAgeYears: 6.4, reuseAffinity: 0.4, residualValueUsd: 78,
    composition: comp({ aluminum: 0.08, steel: 0.3, copper: 0.06, plastics: 0.27, glass: 0.24, gold: 0.00002, ree: 0.0004, cobalt: 0.0, board: 0.08 }),
  },
  {
    id: "laserjet-pro", name: "LaserJet Pro M-series", category: "Printer",
    avgMassKg: 8.9, avgAgeYears: 6.1, reuseAffinity: 0.33, residualValueUsd: 88,
    composition: comp({ aluminum: 0.06, steel: 0.36, copper: 0.08, plastics: 0.4, glass: 0.02, gold: 0.00002, ree: 0.0003, cobalt: 0.0, board: 0.10 }),
  },
  {
    id: "officejet-pro", name: "OfficeJet Pro", category: "Printer",
    avgMassKg: 7.2, avgAgeYears: 5.4, reuseAffinity: 0.29, residualValueUsd: 52,
    composition: comp({ aluminum: 0.04, steel: 0.28, copper: 0.07, plastics: 0.54, glass: 0.01, gold: 0.00002, ree: 0.0002, cobalt: 0.0, board: 0.10 }),
  },
  {
    id: "poly-voyager", name: "Poly Voyager Headset", category: "Accessory",
    avgMassKg: 0.28, avgAgeYears: 3.2, reuseAffinity: 0.36, residualValueUsd: 34,
    composition: comp({ aluminum: 0.05, steel: 0.05, copper: 0.14, plastics: 0.55, glass: 0.0, gold: 0.0001, ree: 0.006, cobalt: 0.004, board: 0.13 }),
  },
];

// regional share of total intake (roughly by installed base)
const REGION_WEIGHT: Record<RegionKey, number> = {
  GCR: 0.29, JPN: 0.16, KOR: 0.12, SEA: 0.15, IND: 0.16, ANZ: 0.12,
};

// model share of total intake
const MODEL_WEIGHT: Record<string, number> = {
  "elitebook-840": 0.19, "probook-450": 0.17, "spectre-x360": 0.07, "chromebook-11": 0.11,
  "z2-workstation": 0.05, "elitedesk-800": 0.12, "e24-monitor": 0.1, "laserjet-pro": 0.07,
  "officejet-pro": 0.06, "poly-voyager": 0.06,
};

function clamp(x: number, lo = 0, hi = 1) {
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Disposition mix for a (model, region, month). Blends model reuse-affinity,
 * regional program maturity, and a monotonic time uplift, with a designed
 * disruption dip in one region so the anomaly detector has a real signal.
 */
function dispositionFor(
  model: DeviceModel,
  region: RegionMeta,
  m: number,
  rnd: () => number
): Record<DispositionKey, number> {
  const t = m / (N_MONTHS - 1); // 0..1 progress across the series
  const affinity = model.reuseAffinity;

  // Program keeps pulling volume up the R-ladder over time + with maturity.
  const uplift = 0.12 * t + 0.18 * (region.maturity - 0.7);

  let reuse = clamp(0.11 + 0.16 * affinity + 0.06 * uplift + (rnd() - 0.5) * 0.03, 0.02);
  let refurbish = clamp(0.19 + 0.28 * affinity + 0.14 * uplift + (rnd() - 0.5) * 0.04, 0.03);
  let harvest = clamp(0.14 + 0.05 * (1 - affinity) + 0.04 * uplift + (rnd() - 0.5) * 0.03, 0.03);
  let recycle = clamp(0.4 - 0.18 * affinity + (rnd() - 0.5) * 0.04, 0.08);
  let disposal = clamp(0.16 - 0.1 * uplift - 0.06 * affinity + (rnd() - 0.5) * 0.02, 0.01);

  // Designed anomaly: an India logistics disruption in months 14–15 spikes
  // recycle+disposal and collapses second-life (a real recoverable event).
  if (region.id === "IND" && (m === 14 || m === 15)) {
    const sev = m === 14 ? 1 : 0.6;
    refurbish *= 1 - 0.42 * sev;
    reuse *= 1 - 0.4 * sev;
    disposal *= 1 + 0.9 * sev;
    recycle *= 1 + 0.25 * sev;
  }

  const sum = reuse + refurbish + harvest + recycle + disposal;
  return {
    reuse: reuse / sum,
    refurbish: refurbish / sum,
    harvest: harvest / sum,
    recycle: recycle / sum,
    disposal: disposal / sum,
  };
}

function seasonal(mIndex: number): number {
  // procurement refresh cycles → Q1 and Q3 intake bumps
  const monthOfYear = ((END_MONTH - (N_MONTHS - 1 - mIndex)) % 12 + 12) % 12;
  return 1 + 0.14 * Math.sin((monthOfYear / 12) * Math.PI * 2 + 0.6);
}

export function buildDataset(): Dataset {
  const months = buildMonths();
  const rnd = mulberry32(20260704);
  const rows: AtomicRow[] = [];

  const TOTAL_BASE = 41000; // ~units/month across APJ at series start

  for (let m = 0; m < N_MONTHS; m++) {
    const growth = 1 + 0.019 * m; // steady program scale-up
    const season = seasonal(m);
    for (const region of REGIONS) {
      for (const model of MODELS) {
        const base =
          TOTAL_BASE * growth * season * REGION_WEIGHT[region.id] * MODEL_WEIGHT[model.id];
        const noise = 0.9 + rnd() * 0.2;
        const units = Math.max(0, Math.round(base * noise));
        rows.push({
          m,
          region: region.id,
          model: model.id,
          units,
          disp: dispositionFor(model, region, m, rnd),
        });
      }
    }
  }

  const materialValuePerKg: Record<MaterialKey, number> = {
    aluminum: 2.1, steel: 0.42, copper: 8.6, plastics: 0.85, glass: 0.06,
    gold: 62000, ree: 48, cobalt: 33, board: 14,
  };
  const recoveryEfficiency: Record<MaterialKey, number> = {
    aluminum: 0.93, steel: 0.95, copper: 0.9, plastics: 0.72, glass: 0.8,
    gold: 0.96, ree: 0.55, cobalt: 0.82, board: 0.88,
  };

  return {
    months,
    regions: REGIONS,
    hubs: HUBS,
    models: MODELS,
    rows,
    meta: {
      program: "Circular Device Program · APJ",
      unitEconomics: {
        co2ePerReuseKg: 268, // avoided embodied emissions, per redeployed unit
        co2ePerRefurbKg: 214, // per refurbished-&-resold unit
        co2ePerHarvestKg: 41, // per unit's harvested components
        co2ePerRecycledTonne: 1350, // avoided virgin extraction, per tonne recovered
        materialValuePerKg,
        recoveryEfficiency,
      },
    },
  };
}
