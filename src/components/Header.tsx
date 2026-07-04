import { pct } from "../lib/format";

export type ModuleId = "tower" | "takeback" | "vault" | "reporting";

const MODULES: { id: ModuleId; label: string; ai?: boolean }[] = [
  { id: "tower", label: "Circular Control Tower" },
  { id: "takeback", label: "Smart Take-Back" },
  { id: "vault", label: "ESG Evidence Vault" },
  { id: "reporting", label: "AI Reporting", ai: true },
];

function LoopMark() {
  return (
    <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-teal to-hp shadow-sm">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" className="text-white">
        <path d="M5 12a7 7 0 0 1 11.9-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M17 3.6V7h-3.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19 12a7 7 0 0 1-11.9 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M7 20.4V17h3.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function Header({
  active,
  onSelect,
  evidenceCoverage,
  dateLabel,
}: {
  active: ModuleId;
  onSelect: (id: ModuleId) => void;
  evidenceCoverage: number;
  dateLabel: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas-panel/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-6 px-5 py-3">
        <div className="flex items-center gap-3">
          <LoopMark />
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <span className="font-display text-[17px] font-bold tracking-tight text-ink">Loop</span>
              <span className="rounded-full border border-line px-1.5 py-px font-mono text-[9px] uppercase tracking-caps text-ink-faint">
                Circular Economy OS
              </span>
            </div>
            <div className="font-mono text-[10px] tracking-caps text-ink-faint">
              CIRCULAR DEVICE PROGRAM · ASIA-PACIFIC &amp; JAPAN
            </div>
          </div>
        </div>

        {/* module tabs */}
        <nav className="hidden items-center gap-1 lg:flex">
          {MODULES.map((m) => {
            const on = active === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onSelect(m.id)}
                className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] transition-colors ${
                  on ? "bg-teal/10 font-semibold text-teal-deep" : "text-ink-faint hover:bg-canvas-sunken hover:text-ink-soft"
                }`}
              >
                {m.label}
                {m.ai && (
                  <span className={`rounded px-1 py-px font-mono text-[8px] uppercase tracking-caps ${on ? "bg-loop/15 text-loop" : "bg-canvas-sunken text-ink-faint"}`}>
                    live
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* status cluster */}
        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <div className="font-mono text-[9px] uppercase tracking-caps text-ink-faint">Evidence coverage</div>
            <div className="flex items-center justify-end gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-loop" />
              <span className="font-mono text-[13px] font-medium text-ink tnum">{pct(evidenceCoverage, 1)}</span>
            </div>
          </div>
          <div className="hidden text-right md:block">
            <div className="font-mono text-[9px] uppercase tracking-caps text-ink-faint">Reporting as of</div>
            <div className="font-mono text-[13px] text-ink">{dateLabel}</div>
          </div>
        </div>
      </div>

      {/* mobile module tabs */}
      <div className="scrollbar-thin flex gap-1 overflow-x-auto px-5 pb-2 lg:hidden">
        {MODULES.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={`whitespace-nowrap rounded-lg px-3 py-1 text-[12px] ${active === m.id ? "bg-teal/10 font-semibold text-teal-deep" : "text-ink-faint"}`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </header>
  );
}
