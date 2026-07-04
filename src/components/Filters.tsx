import type { Filters as FiltersType, RegionKey, RegionMeta } from "../data/types";

const WINDOWS = [
  { m: 3, label: "3M" },
  { m: 6, label: "6M" },
  { m: 12, label: "12M" },
  { m: 24, label: "24M" },
];

export function Filters({
  regions,
  filters,
  onChange,
  showWindow = true,
}: {
  regions: RegionMeta[];
  filters: FiltersType;
  onChange: (f: FiltersType) => void;
  showWindow?: boolean;
}) {
  const selected: Set<RegionKey> =
    filters.regions === "all" ? new Set(regions.map((r) => r.id)) : new Set(filters.regions);
  const isAll = filters.regions === "all";

  const toggleRegion = (id: RegionKey) => {
    // From "All", a click focuses that single region (intuitive drill-down).
    if (isAll) {
      onChange({ ...filters, regions: [id] });
      return;
    }
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    if (next.size === 0 || next.size === regions.length) {
      onChange({ ...filters, regions: "all" });
    } else {
      onChange({ ...filters, regions: [...next] });
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 font-mono text-[9px] uppercase tracking-caps text-ink-faint">Market</span>
        <button
          onClick={() => onChange({ ...filters, regions: "all" })}
          className={`rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors ${
            isAll ? "bg-ink text-white" : "border border-line bg-canvas-panel text-ink-soft hover:border-ink/30"
          }`}
        >
          All APJ
        </button>
        {regions.map((r) => {
          const on = !isAll && selected.has(r.id);
          return (
            <button
              key={r.id}
              onClick={() => toggleRegion(r.id)}
              className={`rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors ${
                on ? "bg-teal text-white" : "border border-line bg-canvas-panel text-ink-soft hover:border-teal/40"
              }`}
              title={r.name}
            >
              {r.short}
            </button>
          );
        })}
      </div>

      {showWindow && (
        <div className="flex items-center gap-1.5">
          <span className="mr-1 font-mono text-[9px] uppercase tracking-caps text-ink-faint">Window</span>
          <div className="flex overflow-hidden rounded-lg border border-line">
            {WINDOWS.map((w) => (
              <button
                key={w.m}
                onClick={() => onChange({ ...filters, monthsBack: w.m })}
                className={`px-2.5 py-1 font-mono text-[11px] transition-colors ${
                  filters.monthsBack === w.m ? "bg-hp text-white" : "bg-canvas-panel text-ink-soft hover:bg-canvas-sunken"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
