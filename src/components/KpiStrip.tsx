import type { Kpi } from "../data/types";
import { kpiValue } from "../lib/format";
import { Delta } from "./ui/Delta";
import { Sparkline } from "./ui/Sparkline";

const ACCENT: Record<string, string> = {
  units: "#0E6C77",
  circularity: "#2FA37A",
  diversion: "#0096D6",
  materials: "#C67A46",
  co2e: "#6C5CE0",
  value: "#E08A2B",
};

function KpiCard({ kpi }: { kpi: Kpi }) {
  const accent = ACCENT[kpi.key] || "#0E6C77";
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl2 border border-line bg-canvas-panel p-4 pl-[18px] shadow-panel transition-shadow hover:shadow-pop">
      <span className="absolute left-0 top-0 h-full w-[3px]" style={{ background: accent }} />
      <div className="flex min-h-[28px] items-start justify-between gap-2">
        <div className="font-mono text-[10px] uppercase leading-tight tracking-caps text-ink-faint">{kpi.label}</div>
        <Delta value={kpi.deltaPct} points={kpi.format === "pct"} goodIsUp={kpi.goodIsUp} />
      </div>

      <div className="mt-2.5 flex items-end justify-between gap-2">
        <div className="whitespace-nowrap font-display text-[28px] font-bold leading-none tracking-tight text-ink tnum">
          {kpiValue(kpi.format, kpi.value)}
        </div>
        <div className="shrink-0">
          <Sparkline data={kpi.spark} color={accent} width={78} height={28} />
        </div>
      </div>

      <p className="mt-3 min-h-[46px] text-[11px] leading-snug text-ink-soft">{kpi.caption}</p>
    </div>
  );
}

export function KpiStrip({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {kpis.map((k) => (
        <KpiCard key={k.key} kpi={k} />
      ))}
    </div>
  );
}
