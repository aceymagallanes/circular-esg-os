import type { RegionKey } from "./types";
import { DATASET } from "./dataset";

export type EvidenceStatus = "verified" | "pending" | "expiring" | "gap";
export type EvidenceType =
  | "Recycling certificate"
  | "Chain-of-custody manifest"
  | "Data-destruction certificate"
  | "Downstream vendor attestation"
  | "Weight reconciliation";

export interface EvidenceRecord {
  id: string;
  type: EvidenceType;
  region: RegionKey;
  regionName: string;
  hub: string;
  period: string; // e.g. "2026-06"
  issuer: string;
  status: EvidenceStatus;
  coverage: number; // 0..1 of the linked volume it evidences
  frameworks: string[];
  issued: string;
  expiry: string | null;
  linkedClaim: string;
}

export const STATUS_META: Record<EvidenceStatus, { label: string; color: string; bg: string }> = {
  verified: { label: "Verified", color: "#2FA37A", bg: "rgba(47,163,122,0.12)" },
  pending: { label: "Pending", color: "#0096D6", bg: "rgba(0,150,214,0.10)" },
  expiring: { label: "Expiring", color: "#E08A2B", bg: "rgba(224,138,43,0.12)" },
  gap: { label: "Gap", color: "#C24A44", bg: "rgba(194,74,68,0.12)" },
};

const TYPES: { type: EvidenceType; frameworks: string[]; claim: string }[] = [
  { type: "Recycling certificate", frameworks: ["GRI 306-4", "ESRS E5", "R2v3"], claim: "Materials recovered & recycled" },
  { type: "Chain-of-custody manifest", frameworks: ["R2v3", "e-Stewards"], claim: "Downstream chain-of-custody" },
  { type: "Data-destruction certificate", frameworks: ["NIST 800-88", "ISO 27001"], claim: "Secure data sanitisation" },
  { type: "Downstream vendor attestation", frameworks: ["ESRS E5", "R2v3"], claim: "Certified downstream processing" },
  { type: "Weight reconciliation", frameworks: ["GRI 306-3", "ISO 14001"], claim: "Diverted tonnage reconciliation" },
];

const VENDORS = ["TES-AMM", "Sims Lifecycle", "SK tes", "Cimelia", "Enviro-Hub", "Veolia APAC"];

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick<T>(a: T[], r: number): T {
  return a[Math.floor(r * a.length) % a.length];
}

function statusFor(r: number): EvidenceStatus {
  if (r < 0.7) return "verified";
  if (r < 0.85) return "pending";
  if (r < 0.94) return "expiring";
  return "gap";
}

function buildRecords(): EvidenceRecord[] {
  const rnd = mulberry32(424242);
  const out: EvidenceRecord[] = [];
  const months = DATASET.months.slice(-6);
  const N = 44;
  for (let i = 0; i < N; i++) {
    const region = pick(DATASET.regions, rnd());
    const t = pick(TYPES, rnd());
    const month = pick(months, rnd());
    const status = statusFor(rnd());
    const coverage =
      status === "gap" ? 0.4 + rnd() * 0.25 : status === "pending" ? 0.7 + rnd() * 0.2 : 0.9 + rnd() * 0.1;
    const issuerBase =
      t.type === "Downstream vendor attestation" || t.type === "Chain-of-custody manifest"
        ? pick(VENDORS, rnd())
        : region.hub;
    const [yy, mm] = month.key.split("-").map(Number);
    const issued = `${yy}-${String(mm).padStart(2, "0")}-${String(3 + Math.floor(rnd() * 24)).padStart(2, "0")}`;
    const expiry =
      t.type === "Data-destruction certificate" || t.type === "Weight reconciliation"
        ? null
        : `${yy + 1}-${String(mm).padStart(2, "0")}-01`;
    out.push({
      id: `EV-${2600 + i}`,
      type: t.type,
      region: region.id,
      regionName: region.short,
      hub: region.hub,
      period: month.key,
      issuer: issuerBase,
      status,
      coverage: Math.min(1, coverage),
      frameworks: t.frameworks,
      issued,
      expiry,
      linkedClaim: t.claim,
    });
  }
  return out;
}

export const EVIDENCE_RECORDS = buildRecords();

export interface ClaimTrace {
  claim: string;
  metric: string;
  coverage: number;
  records: number;
  status: EvidenceStatus;
}

export interface EvidenceView {
  records: EvidenceRecord[];
  counts: Record<EvidenceStatus, number>;
  overallCoverage: number;
  auditReadiness: number;
  byType: { type: EvidenceType; count: number; coverage: number }[];
  expiringSoon: EvidenceRecord[];
  gaps: EvidenceRecord[];
  claims: ClaimTrace[];
  copilotContext: Record<string, unknown>;
}

export function buildEvidenceView(
  regions: RegionKey[] | "all",
  headline: { diversionRate: number; co2eAvoidedTonnes: number; materialTonnes: number }
): EvidenceView {
  const match = (r: RegionKey) => regions === "all" || regions.includes(r);
  const records = EVIDENCE_RECORDS.filter((r) => match(r.region));

  const counts: Record<EvidenceStatus, number> = { verified: 0, pending: 0, expiring: 0, gap: 0 };
  records.forEach((r) => counts[r.status]++);

  const overallCoverage = records.length ? records.reduce((a, r) => a + r.coverage, 0) / records.length : 0;
  // audit readiness: coverage weighted down by gaps/expiring
  const penalty = (counts.gap * 0.6 + counts.expiring * 0.2) / (records.length || 1);
  const auditReadiness = Math.max(0, Math.min(1, overallCoverage - penalty * 0.5));

  const typeSet = [...new Set(records.map((r) => r.type))] as EvidenceType[];
  const byType = typeSet.map((type) => {
    const rs = records.filter((r) => r.type === type);
    return { type, count: rs.length, coverage: rs.reduce((a, r) => a + r.coverage, 0) / (rs.length || 1) };
  });

  const expiringSoon = records.filter((r) => r.status === "expiring");
  const gaps = records.filter((r) => r.status === "gap");

  const traceFor = (claim: string, metric: string, keyword: string): ClaimTrace => {
    const rs = records.filter((r) => r.linkedClaim.toLowerCase().includes(keyword));
    const cov = rs.length ? rs.reduce((a, r) => a + r.coverage, 0) / rs.length : 0;
    const hasGap = rs.some((r) => r.status === "gap");
    const hasExp = rs.some((r) => r.status === "expiring");
    return {
      claim,
      metric,
      coverage: cov,
      records: rs.length,
      status: hasGap ? "gap" : hasExp ? "expiring" : cov > 0.9 ? "verified" : "pending",
    };
  };

  const claims: ClaimTrace[] = [
    traceFor("Landfill diversion", `${(headline.diversionRate * 100).toFixed(1)}%`, "reconciliation"),
    traceFor("Materials recovered & recycled", `${Math.round(headline.materialTonnes)} t`, "recycled"),
    traceFor("Certified downstream processing", "R2v3 / e-Stewards", "downstream"),
    traceFor("Secure data sanitisation", "NIST 800-88", "data"),
    traceFor("Chain-of-custody integrity", "end-to-end", "custody"),
  ];

  return {
    records: records.sort((a, b) => (a.period < b.period ? 1 : -1)),
    counts,
    overallCoverage,
    auditReadiness,
    byType,
    expiringSoon,
    gaps,
    claims,
    copilotContext: {
      module: "ESG Evidence Vault",
      geography: "APJ is one region containing six markets (Greater China, Japan, South Korea, India, Southeast Asia/ASEAN, Australia & New Zealand). Refer to them as markets, not regions.",
      marketScope: regions === "all" ? "All six APJ markets" : regions,
      totalRecords: records.length,
      overallCoveragePct: +(overallCoverage * 100).toFixed(1),
      auditReadinessPct: +(auditReadiness * 100).toFixed(1),
      statusCounts: counts,
      openGaps: gaps.length,
      expiringCertificates: expiringSoon.length,
      claimTraceability: claims.map((c) => ({ claim: c.claim, coveragePct: +(c.coverage * 100).toFixed(0), status: c.status, records: c.records })),
    },
  };
}
