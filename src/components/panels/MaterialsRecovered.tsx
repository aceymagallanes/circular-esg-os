import type { ControlTowerView } from "../../data/types";
import { Panel } from "../ui/Panel";
import { compact, usd } from "../../lib/format";

type Materials = ControlTowerView["materials"];

export function MaterialsRecovered({ materials }: { materials: Materials }) {
  const top = materials.filter((m) => m.kg > 0).slice(0, 8);
  const maxVal = Math.max(1, ...top.map((m) => m.valueUsd));
  const totalValue = materials.reduce((a, m) => a + m.valueUsd, 0);
  const totalKg = materials.reduce((a, m) => a + m.kg, 0);

  return (
    <Panel
      eyebrow="Secondary raw materials"
      title="Materials returned to supply"
      subtitle="Certified secondary materials, ranked by recovered value."
      right={
        <div className="text-right">
          <div className="font-display text-[15px] font-semibold text-ink tnum">{usd(totalValue)}</div>
          <div className="font-mono text-[9px] uppercase tracking-caps text-ink-faint">{compact(totalKg / 1000, 1)} t total</div>
        </div>
      }
    >
      <ul className="space-y-2.5">
        {top.map((m) => (
          <li key={m.key}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="flex items-center gap-2 text-[12px] font-medium text-ink">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: m.color }} />
                {m.label}
              </span>
              <span className="font-mono text-[11px] text-ink-soft tnum">
                {m.kg >= 1000 ? `${compact(m.kg / 1000, 1)} t` : `${Math.round(m.kg)} kg`} · <span className="text-ink">{usd(m.valueUsd)}</span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas-sunken">
              <div className="h-full rounded-full" style={{ width: `${(m.valueUsd / maxVal) * 100}%`, background: m.color }} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
