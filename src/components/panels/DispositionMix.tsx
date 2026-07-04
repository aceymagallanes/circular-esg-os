import type { DispositionDatum } from "../../data/types";
import { DISPOSITION_META } from "../../data/palette";
import { Panel } from "../ui/Panel";
import { compact, pct } from "../../lib/format";

export function DispositionMix({ data }: { data: DispositionDatum[] }) {
  const total = data.reduce((a, d) => a + d.units, 0) || 1;
  return (
    <Panel
      eyebrow="Waste hierarchy · disposition"
      title="Asset disposition mix"
      subtitle="Allocation of recovered assets by recovery strategy, ordered by value retention."
    >
      {/* 100% stacked bar */}
      <div className="mb-4 flex h-9 w-full overflow-hidden rounded-lg">
        {data.map((d) => (
          <div
            key={d.key}
            className="group relative h-full transition-[flex-basis] duration-500"
            style={{ flexBasis: `${(d.units / total) * 100}%`, background: d.color }}
            title={`${d.label}: ${pct(d.units / total, 1)}`}
          >
            {d.units / total > 0.08 && (
              <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-medium text-white/95">
                {(d.share * 100).toFixed(0)}%
              </span>
            )}
          </div>
        ))}
      </div>

      <ul className="space-y-2">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.color }} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12px] font-medium text-ink">{d.label}</span>
                <span className="font-mono text-[12px] text-ink tnum">{pct(d.share, 1)}</span>
              </div>
              <div className="text-[10px] text-ink-faint">{DISPOSITION_META[d.key].note} · {compact(d.units, 1)} units</div>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
