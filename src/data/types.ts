// ── Domain types for the Circular Economy Control Tower ────────────────────

export type DispositionKey =
  | "reuse" // redeploy device as-is (highest value retention)
  | "refurbish" // refurbish & resell (second life)
  | "harvest" // parts harvested for spares (component circularity)
  | "recycle" // shredded, materials recovered (material circularity)
  | "disposal"; // responsible disposal / energy recovery (leakage)

export type MaterialKey =
  | "aluminum"
  | "steel"
  | "copper"
  | "plastics"
  | "glass"
  | "gold"
  | "ree" // rare earth elements
  | "cobalt"
  | "board"; // reclaimed circuit-board assemblies

export type RegionKey = "ANZ" | "GCR" | "IND" | "JPN" | "SEA" | "KOR";

export type DeviceCategory =
  | "Laptop"
  | "Desktop"
  | "Workstation"
  | "Display"
  | "Printer"
  | "Accessory";

export interface DeviceModel {
  id: string;
  name: string;
  category: DeviceCategory;
  avgMassKg: number;
  avgAgeYears: number; // typical age at end-of-life
  /** baseline second-life (reuse+refurbish) propensity, 0..1 */
  reuseAffinity: number;
  residualValueUsd: number; // resale value of a refurbished unit
  /** fractional material composition of the shredded mass (sums ~1) */
  composition: Record<MaterialKey, number>;
}

export interface RegionMeta {
  id: RegionKey;
  name: string;
  short: string;
  x: number; // 0..100 canvas coords for the network map
  y: number;
  hub: string; // certified recovery hub the region routes to
  maturity: number; // program maturity 0..1 (drives circularity uplift)
}

export interface HubMeta {
  id: string;
  name: string;
  x: number;
  y: number;
  certification: string;
}

/** One atomic row: units of a model, from a region, in a month. */
export interface AtomicRow {
  m: number; // month index 0..N-1
  region: RegionKey;
  model: string; // DeviceModel.id
  units: number;
  disp: Record<DispositionKey, number>; // shares, sum to 1
}

export interface MonthMeta {
  index: number;
  key: string; // YYYY-MM
  label: string; // e.g. "Feb '26"
}

export interface Dataset {
  months: MonthMeta[];
  regions: RegionMeta[];
  hubs: HubMeta[];
  models: DeviceModel[];
  rows: AtomicRow[];
  meta: {
    program: string;
    unitEconomics: {
      co2ePerReuseKg: number;
      co2ePerRefurbKg: number;
      co2ePerHarvestKg: number;
      co2ePerRecycledTonne: number; // avoided virgin extraction per tonne recovered
      materialValuePerKg: Record<MaterialKey, number>;
      recoveryEfficiency: Record<MaterialKey, number>;
    };
  };
}

// ── View-model (post-aggregation) types ────────────────────────────────────

export interface Filters {
  regions: RegionKey[] | "all";
  monthsBack: number; // trailing window length
}

export interface Kpi {
  key: string;
  label: string;
  unit: string;
  value: number;
  prev: number;
  deltaPct: number; // vs previous equivalent window
  spark: number[]; // monthly series across the window
  goodIsUp: boolean;
  format: "int" | "pct" | "tonne" | "usd" | "kg";
  caption: string; // data-derived insight
}

export interface DispositionDatum {
  key: DispositionKey;
  label: string;
  units: number;
  share: number;
  color: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}
export interface SankeyGraph {
  nodes: { id: string; label: string; kind: "category" | "disposition" | "material"; color: string }[];
  links: SankeyLink[];
}

export interface TrendPoint {
  index: number;
  label: string;
  value: number;
}

export interface ForecastPoint {
  index: number;
  label: string;
  actual: number | null;
  fitted: number | null;
  forecast: number | null;
  lo: number | null;
  hi: number | null;
}

export interface WaterfallStep {
  key: string;
  label: string;
  value: number; // signed contribution (tonnes CO2e)
  kind: "increase" | "decrease" | "total";
  color: string;
}

export interface CohortCell {
  model: string;
  modelName: string;
  ageBand: string;
  units: number;
  yield: number; // value-retention / circularity yield 0..1
}

export interface AnomalyPoint extends TrendPoint {
  z: number;
  isAnomaly: boolean;
  mean: number;
  band: number; // ±band around mean (2σ)
}

export interface FlowLink {
  from: { x: number; y: number; label: string };
  to: { x: number; y: number; label: string };
  value: number;
  circularity: number;
}

export interface ControlTowerView {
  filters: Filters;
  windowLabel: string;
  kpis: Kpi[];
  dispositions: DispositionDatum[];
  sankey: SankeyGraph;
  materials: { key: MaterialKey; label: string; kg: number; valueUsd: number; color: string }[];
  circularityForecast: ForecastPoint[];
  emissionsWaterfall: WaterfallStep[];
  cohort: { models: { id: string; name: string }[]; ageBands: string[]; cells: CohortCell[] };
  anomaly: { title: string; unit: string; points: AnomalyPoint[] };
  networkFlows: FlowLink[];
  nodes: { regions: RegionMeta[]; hubs: HubMeta[] };
  headline: {
    totalUnits: number;
    circularityRate: number;
    diversionRate: number;
    materialTonnes: number;
    co2eAvoidedTonnes: number;
    recoveryValueUsd: number;
    evidenceCoverage: number;
  };
  // compact structured context handed to the Claude Copilot
  copilotContext: Record<string, unknown>;
}
