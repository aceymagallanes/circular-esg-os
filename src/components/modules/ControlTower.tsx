import type { ControlTowerView } from "../../data/types";
import { KpiStrip } from "../KpiStrip";
import { MaterialFlowSankey } from "../panels/MaterialFlowSankey";
import { CircularityForecast } from "../panels/CircularityForecast";
import { DispositionMix } from "../panels/DispositionMix";
import { EmissionsWaterfall } from "../panels/EmissionsWaterfall";
import { RecoveryCohortMatrix } from "../panels/RecoveryCohortMatrix";
import { MaterialsRecovered } from "../panels/MaterialsRecovered";
import { NetworkFlowMap } from "../panels/NetworkFlowMap";
import { AnomalyTimeSeries } from "../panels/AnomalyTimeSeries";

export function ControlTower({ view }: { view: ControlTowerView }) {
  return (
    <div className="space-y-4">
      <KpiStrip kpis={view.kpis} />

      <MaterialFlowSankey graph={view.sankey} />

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8 [&>section]:h-full">
          <CircularityForecast data={view.circularityForecast} />
        </div>
        <div className="lg:col-span-4 [&>section]:h-full">
          <DispositionMix data={view.dispositions} />
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5 [&>section]:h-full">
          <EmissionsWaterfall steps={view.emissionsWaterfall} />
        </div>
        <div className="lg:col-span-7 [&>section]:h-full">
          <RecoveryCohortMatrix cohort={view.cohort} />
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7 [&>section]:h-full">
          <NetworkFlowMap view={view} />
        </div>
        <div className="lg:col-span-5 [&>section]:h-full">
          <MaterialsRecovered materials={view.materials} />
        </div>
      </div>

      <AnomalyTimeSeries title={view.anomaly.title} points={view.anomaly.points} />

      <FrameworkFooter />
    </div>
  );
}

function FrameworkFooter() {
  const items = [
    { k: "GRI 306", v: "Waste" },
    { k: "ESRS E5", v: "Resource use & circular economy" },
    { k: "ISO 14001", v: "Environmental management" },
    { k: "R2v3 / e-Stewards", v: "Certified downstream" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl2 border border-line bg-canvas-panel px-5 py-3.5 shadow-panel">
      <span className="font-mono text-[9px] uppercase tracking-caps text-ink-faint">Disclosure alignment</span>
      {items.map((i) => (
        <span key={i.k} className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-teal" />
          <span className="text-[11.5px] font-semibold text-ink">{i.k}</span>
          <span className="text-[11px] text-ink-faint">· {i.v}</span>
        </span>
      ))}
    </div>
  );
}
