import type { ControlTowerView } from "../../data/types";
import { Panel } from "../ui/Panel";
import { compact } from "../../lib/format";

type Cohort = ControlTowerView["cohort"];

export function RecoveryCohortMatrix({ cohort }: { cohort: Cohort }) {
  const cellByKey = new Map(cohort.cells.map((c) => [`${c.model}|${c.ageBand}`, c]));

  return (
    <Panel
      eyebrow="Cohort analysis · second-life yield"
      title="Second-life yield by asset model"
      subtitle="Value-retention rate by asset model across end-of-life age bands; darker cells indicate higher second-life yield."
      right={<YieldLegend />}
      bodyClassName="pt-3"
    >
      <div className="overflow-x-auto scrollbar-thin">
        <div
          className="grid min-w-[560px] gap-1 text-[11px]"
          style={{ gridTemplateColumns: `168px repeat(${cohort.ageBands.length}, minmax(0,1fr))` }}
        >
          {/* header row */}
          <div className="px-1 py-1.5 font-mono text-[9px] uppercase tracking-caps text-ink-faint">
            Model ▸ age
          </div>
          {cohort.ageBands.map((b) => (
            <div key={b} className="px-1 py-1.5 text-center font-mono text-[10px] text-ink-soft">
              {b}
            </div>
          ))}

          {/* rows */}
          {cohort.models.map((m) => (
            <Row key={m.id} name={m.name}>
              {cohort.ageBands.map((band) => {
                const cell = cellByKey.get(`${m.id}|${band}`);
                const y = cell?.yield ?? 0;
                const alpha = 0.1 + y * 0.85;
                const strong = y > 0.62;
                return (
                  <div
                    key={band}
                    className="group relative flex h-11 flex-col items-center justify-center rounded-md transition-transform hover:scale-[1.04]"
                    style={{ background: `rgba(47,163,122,${alpha.toFixed(3)})` }}
                    title={`${m.name} · ${band}\nYield ${(y * 100).toFixed(0)}% · ${compact(cell?.units ?? 0, 1)} units`}
                  >
                    <span className={`font-mono text-[12px] font-medium tnum ${strong ? "text-white" : "text-ink"}`}>
                      {(y * 100).toFixed(0)}
                    </span>
                    <span className={`text-[8px] ${strong ? "text-white/75" : "text-ink-soft"}`}>
                      {compact(cell?.units ?? 0, 0)}u
                    </span>
                  </div>
                );
              })}
            </Row>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function Row({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <>
      <div className="flex items-center truncate px-1 text-[11px] font-medium text-ink" title={name}>
        {name}
      </div>
      {children}
    </>
  );
}

function YieldLegend() {
  return (
    <div className="flex items-center gap-2 text-[9px] text-ink-faint">
      <span>low</span>
      <span className="h-2 w-24 rounded-full" style={{ background: "linear-gradient(90deg, rgba(47,163,122,0.12), rgba(47,163,122,0.95))" }} />
      <span>high yield</span>
    </div>
  );
}
