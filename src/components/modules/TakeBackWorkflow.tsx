import { useMemo, useState } from "react";
import type { RegionKey } from "../../data/types";
import { buildTakeBackView, STAGES, type Grade, type TakeBackRequest } from "../../data/takeback";
import { DISPOSITION_META } from "../../data/palette";
import { Panel } from "../ui/Panel";
import { compact, usd, pct } from "../../lib/format";

const GRADE_COLOR: Record<Grade, string> = { A: "#2FA37A", B: "#0096D6", C: "#E08A2B", D: "#C24A44" };

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

function DispChip({ k, conf }: { k: TakeBackRequest["aiDisposition"]; conf: number }) {
  const m = DISPOSITION_META[k];
  return (
    <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ background: m.color + "1A", color: m.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
      {m.short}
      <span className="font-mono opacity-70">{(conf * 100).toFixed(0)}%</span>
    </span>
  );
}

function Card({ r, onClick, active }: { r: TakeBackRequest; onClick: () => void; active: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border bg-canvas-panel p-2.5 text-left transition-all hover:shadow-panel ${active ? "border-teal ring-1 ring-teal/30" : "border-line"}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-ink-faint">{r.id}</span>
        <span className="flex items-center gap-1">
          <span className="grid h-4 w-4 place-items-center rounded text-[9px] font-bold text-white" style={{ background: GRADE_COLOR[r.grade] }}>{r.grade}</span>
          {!r.onTime && <span className="h-1.5 w-1.5 rounded-full bg-alert" title="SLA at risk" />}
        </span>
      </div>
      <div className="mt-1 truncate text-[12px] font-medium text-ink">{r.modelName}</div>
      <div className="mt-0.5 flex items-center justify-between text-[10px] text-ink-faint">
        <span>{r.regionName} · {compact(r.units, 0)}u</span>
        <span>{r.source}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <DispChip k={r.aiDisposition} conf={r.confidence} />
        <span className="font-mono text-[10px] text-ink-soft">{usd(r.estValueUsd)}</span>
      </div>
    </button>
  );
}

export function TakeBackWorkflow({ regions }: { regions: RegionKey[] | "all" }) {
  const view = useMemo(() => buildTakeBackView(regions), [regions]);
  const [selected, setSelected] = useState<TakeBackRequest | null>(null);
  const sel = selected && view.requests.find((r) => r.id === selected.id) ? selected : null;

  const queue = view.requests.filter((r) => r.stage === "graded" || r.stage === "triage").slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat label="Open requests" value={String(view.kpis.openRequests)} sub={`${compact(view.kpis.unitsInFlight, 1)} assets in transit`} accent="#6C5CE0" />
        <Stat label="On-time service level" value={pct(view.kpis.onTimePct, 0)} sub={`${view.kpis.atRisk} requests at risk`} accent="#0096D6" />
        <Stat label="AI auto-routed" value={pct(view.kpis.autoRoutedPct, 0)} sub="≥80% confidence, no manual review" accent="#2FA37A" />
        <Stat label="Average cycle time" value={`${view.kpis.avgCycleDays.toFixed(0)}d`} sub="request to disposition" accent="#E08A2B" />
        <Stat label="At risk" value={String(view.kpis.atRisk)} sub="breaching stage service level" accent="#C24A44" />
      </div>

      {/* pipeline board */}
      <Panel
        eyebrow="Reverse logistics pipeline"
        title="Take-back request lifecycle"
        subtitle="Returned asset batches tracked across the recovery lifecycle. Each record carries an AI-recommended disposition; a red indicator denotes a service-level exception."
        bodyClassName="pt-3"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {STAGES.map((s) => {
            const items = view.byStage[s.key];
            const units = items.reduce((a, r) => a + r.units, 0);
            return (
              <div key={s.key} className="flex min-w-0 flex-col rounded-xl bg-canvas-sunken/60 p-2">
                <div className="mb-2 flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-[11.5px] font-semibold text-ink">{s.label}</span>
                  </div>
                  <span className="font-mono text-[10px] text-ink-faint">{items.length}</span>
                </div>
                <div className="mb-2 px-1 font-mono text-[9px] text-ink-faint">{compact(units, 1)}u · SLA {s.sla}d</div>
                <div className="scrollbar-thin flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-0.5">
                  {items.slice(0, 12).map((r) => (
                    <Card key={r.id} r={r} active={sel?.id === r.id} onClick={() => setSelected(r)} />
                  ))}
                  {items.length === 0 && <div className="px-1 py-4 text-center text-[10px] text-ink-faint">— clear —</div>}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* selected asset AI recommendation */}
      {sel && (
        <Panel
          eyebrow="AI disposition recommendation"
          title={`${sel.id} · ${sel.modelName}`}
          subtitle={`${sel.regionName} · ${sel.source} · ${compact(sel.units, 0)} units · grade ${sel.grade} · ${sel.ageYears.toFixed(1)}y`}
          right={<button onClick={() => setSelected(null)} className="rounded-md px-2 py-1 text-[11px] text-ink-faint hover:bg-canvas-sunken">Close</button>}
        >
          <div className="grid gap-4 md:grid-cols-[1fr_260px]">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-caps text-ink-faint">Recommended route</span>
                <DispChip k={sel.aiDisposition} conf={sel.confidence} />
                {sel.autoRoutable ? (
                  <span className="rounded bg-loop/12 px-1.5 py-0.5 font-mono text-[9px] text-loop">AUTO-ROUTE ELIGIBLE</span>
                ) : (
                  <span className="rounded bg-signal/12 px-1.5 py-0.5 font-mono text-[9px] text-signal">NEEDS REVIEW</span>
                )}
              </div>
              <p className="text-[13px] leading-relaxed text-ink-soft">{sel.rationale}</p>
              <div className="mt-3 flex gap-2">
                <button className="rounded-lg bg-teal px-3 py-1.5 text-[12px] font-medium text-white hover:bg-teal-deep">Accept &amp; route</button>
                <button className="rounded-lg border border-line px-3 py-1.5 text-[12px] text-ink-soft hover:bg-canvas-sunken">Override…</button>
              </div>
            </div>
            <div className="space-y-2 rounded-xl border border-line bg-canvas p-3">
              <Metric label="Est. recovery value" value={usd(sel.estValueUsd)} />
              <Metric label="Est. CO₂e avoided" value={`${compact(sel.estCo2eKg / 1000, 1)} t`} />
              <Metric label="Confidence" value={pct(sel.confidence, 0)} />
              <Metric label="SLA" value={sel.onTime ? `On time (${sel.ageInStageDays}/${sel.slaDays}d)` : `At risk (${sel.ageInStageDays}/${sel.slaDays}d)`} danger={!sel.onTime} />
            </div>
          </div>
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* disposition split */}
        <Panel className="h-full" eyebrow="AI routing" title="Recommended disposition mix" subtitle="AI-recommended routing of current intake across recovery strategies.">
          <div className="mb-3 flex h-8 w-full overflow-hidden rounded-lg">
            {view.dispositionSplit.map((d) => (
              <div key={d.key} className="h-full" style={{ flexBasis: `${d.share * 100}%`, background: d.color }} title={`${d.label}: ${pct(d.share, 1)}`} />
            ))}
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {view.dispositionSplit.map((d) => (
              <li key={d.key} className="flex items-center justify-between rounded-lg border border-line px-2.5 py-1.5">
                <span className="flex items-center gap-1.5 text-[12px] text-ink"><span className="h-2 w-2 rounded-sm" style={{ background: d.color }} />{DISPOSITION_META[d.key].label}</span>
                <span className="font-mono text-[12px] text-ink tnum">{pct(d.share, 0)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        {/* AI queue */}
        <Panel className="h-full" eyebrow="Action queue" title="Awaiting disposition" subtitle="High-value batches in triage or grading, prioritised for routing.">
          <div className="scrollbar-thin max-h-[300px] overflow-y-auto">
            <table className="w-full text-[11.5px]">
              <thead className="text-left font-mono text-[9px] uppercase tracking-caps text-ink-faint">
                <tr className="border-b border-line">
                  <th className="py-1.5">Request</th>
                  <th>Units</th>
                  <th>AI route</th>
                  <th className="text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((r) => (
                  <tr key={r.id} className="border-b border-line/60 hover:bg-canvas-sunken/50" onClick={() => setSelected(r)} role="button">
                    <td className="py-1.5">
                      <div className="font-medium text-ink">{r.modelName}</div>
                      <div className="font-mono text-[9px] text-ink-faint">{r.id} · {r.regionName}</div>
                    </td>
                    <td className="font-mono text-ink-soft">{compact(r.units, 0)}</td>
                    <td><DispChip k={r.aiDisposition} conf={r.confidence} /></td>
                    <td className="text-right font-mono text-ink">{usd(r.estValueUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Metric({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-ink-faint">{label}</span>
      <span className={`font-mono text-[12px] ${danger ? "text-alert" : "text-ink"}`}>{value}</span>
    </div>
  );
}
