import { useMemo, useState } from "react";
import type { RegionKey } from "../../data/types";
import { buildEvidenceView, STATUS_META, type EvidenceStatus } from "../../data/evidence";
import { Panel } from "../ui/Panel";
import { pct } from "../../lib/format";

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-xl2 border border-line bg-canvas-panel p-4 pl-[18px] shadow-panel">
      <span className="absolute left-0 top-0 h-full w-[3px]" style={{ background: accent }} />
      <div className="font-mono text-[10px] uppercase tracking-caps text-ink-faint">{label}</div>
      <div className="mt-2 whitespace-nowrap font-display text-[27px] font-bold leading-none text-ink tnum">{value}</div>
      {sub && <div className="mt-auto pt-2 text-[11px] text-ink-soft">{sub}</div>}
    </div>
  );
}

function StatusPill({ s }: { s: EvidenceStatus }) {
  const m = STATUS_META[s];
  return (
    <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ background: m.bg, color: m.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

export function EvidenceVault({
  regions,
  headline,
}: {
  regions: RegionKey[] | "all";
  headline: { diversionRate: number; co2eAvoidedTonnes: number; materialTonnes: number };
}) {
  const view = useMemo(() => buildEvidenceView(regions, headline), [regions, headline]);
  const [filter, setFilter] = useState<EvidenceStatus | "all">("all");
  const rows = filter === "all" ? view.records : view.records.filter((r) => r.status === filter);

  const readinessColor = view.auditReadiness > 0.85 ? "#2FA37A" : view.auditReadiness > 0.7 ? "#E08A2B" : "#C24A44";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat label="Audit readiness" value={pct(view.auditReadiness, 0)} sub={view.auditReadiness > 0.85 ? "Disclosure-ready" : "Remediation required"} accent={readinessColor} />
        <Stat label="Evidence coverage" value={pct(view.overallCoverage, 0)} sub={`${view.records.length} records on file`} accent="#0096D6" />
        <Stat label="Verified" value={String(view.counts.verified)} sub="third-party confirmed" accent="#2FA37A" />
        <Stat label="Expiring" value={String(view.counts.expiring)} sub="certificates lapsing < 90 days" accent="#E08A2B" />
        <Stat label="Open gaps" value={String(view.counts.gap)} sub="missing or insufficient" accent="#C24A44" />
      </div>

      {/* claims traceability */}
      <Panel
        eyebrow="Claim ↔ evidence traceability"
        title="Every headline claim, backed by evidence"
        subtitle="Each disclosed figure is traced to its supporting evidence chain and coverage. Gaps block sign-off."
      >
        <div className="space-y-2.5">
          {view.claims.map((c) => (
            <div key={c.claim} className="flex items-center gap-3">
              <div className="w-[220px] shrink-0">
                <div className="text-[12.5px] font-medium text-ink">{c.claim}</div>
                <div className="font-mono text-[10px] text-ink-faint">{c.metric} · {c.records} records</div>
              </div>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-canvas-sunken">
                <div className="h-full rounded-full" style={{ width: `${c.coverage * 100}%`, background: STATUS_META[c.status].color }} />
              </div>
              <span className="w-12 text-right font-mono text-[12px] text-ink tnum">{pct(c.coverage, 0)}</span>
              <div className="w-20 text-right"><StatusPill s={c.status} /></div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* ledger */}
        <div className="lg:col-span-8">
          <Panel
            eyebrow="Evidence ledger"
            title="Chain-of-custody & certificate register"
            subtitle="Immutable record of every downstream certificate, manifest and attestation."
            right={
              <div className="flex flex-wrap gap-1">
                {(["all", "verified", "pending", "expiring", "gap"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-md px-2 py-0.5 text-[10px] font-medium capitalize transition-colors ${filter === f ? "bg-ink text-white" : "border border-line text-ink-soft hover:bg-canvas-sunken"}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            }
            bodyClassName="pt-2"
          >
            <div className="scrollbar-thin max-h-[440px] overflow-y-auto">
              <table className="w-full text-[11.5px]">
                <thead className="sticky top-0 bg-canvas-panel text-left font-mono text-[9px] uppercase tracking-caps text-ink-faint">
                  <tr className="border-b border-line">
                    <th className="py-2">Record</th>
                    <th>Region · Hub</th>
                    <th>Period</th>
                    <th>Coverage</th>
                    <th className="text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-line/60 align-top hover:bg-canvas-sunken/40">
                      <td className="py-2">
                        <div className="font-medium text-ink">{r.type}</div>
                        <div className="font-mono text-[9px] text-ink-faint">{r.id} · {r.issuer}</div>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {r.frameworks.map((f) => (
                            <span key={f} className="rounded bg-canvas-sunken px-1 py-px font-mono text-[8px] text-ink-soft">{f}</span>
                          ))}
                        </div>
                      </td>
                      <td className="text-ink-soft">{r.regionName}<div className="text-[9px] text-ink-faint">{r.hub}</div></td>
                      <td className="font-mono text-ink-soft">{r.period}</td>
                      <td className="font-mono text-ink">{pct(r.coverage, 0)}</td>
                      <td className="text-right"><StatusPill s={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* by type + remediation */}
        <div className="lg:col-span-4 space-y-4">
          <Panel eyebrow="Coverage by type" title="Evidence completeness">
            <ul className="space-y-3">
              {view.byType.map((t) => (
                <li key={t.type}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-[11.5px] text-ink">{t.type}</span>
                    <span className="font-mono text-[11px] text-ink-soft">{pct(t.coverage, 0)} · {t.count}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas-sunken">
                    <div className="h-full rounded-full bg-teal" style={{ width: `${t.coverage * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel eyebrow="Remediation" title="Needs attention" right={<span className="rounded-md bg-alert/10 px-2 py-0.5 font-mono text-[10px] text-alert">{view.gaps.length + view.expiringSoon.length}</span>}>
            <ul className="space-y-2">
              {[...view.gaps, ...view.expiringSoon].slice(0, 6).map((r) => (
                <li key={r.id} className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5">
                  <StatusPill s={r.status} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11.5px] text-ink">{r.type}</div>
                    <div className="font-mono text-[9px] text-ink-faint">{r.id} · {r.regionName} · {r.period}</div>
                  </div>
                </li>
              ))}
              {view.gaps.length + view.expiringSoon.length === 0 && (
                <li className="py-4 text-center text-[11px] text-loop">All evidence current — no open items.</li>
              )}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
