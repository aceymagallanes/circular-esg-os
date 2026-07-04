import { useMemo, useRef, useState, useCallback } from "react";
import { DATASET } from "./data/dataset";
import { buildView } from "./data/selectors";
import { buildTakeBackView } from "./data/takeback";
import { buildEvidenceView } from "./data/evidence";
import type { Filters as FiltersType } from "./data/types";
import { Header, type ModuleId } from "./components/Header";
import { Filters } from "./components/Filters";
import { ControlTower } from "./components/modules/ControlTower";
import { TakeBackWorkflow } from "./components/modules/TakeBackWorkflow";
import { EvidenceVault } from "./components/modules/EvidenceVault";
import { ReportingStudio } from "./components/modules/ReportingStudio";
import { CopilotPanel } from "./components/copilot/CopilotPanel";

const TITLES: Record<ModuleId, { eyebrow: string; title: string; subtitle: string; showWindow: boolean }> = {
  tower: {
    eyebrow: "Executive briefing",
    title: "End-of-Life Asset Recovery",
    subtitle:
      "A real-time view of enterprise end-of-life asset recovery across Asia-Pacific & Japan — spanning collection, reuse, refurbishment, component harvest and certified material recovery.",
    showWindow: true,
  },
  takeback: {
    eyebrow: "Operations · reverse logistics",
    title: "Smart Product Take-Back",
    subtitle:
      "Monitor each returned asset from end-of-life request through collection, triage and AI-directed disposition, with service-level and recovered-value visibility at every stage.",
    showWindow: false,
  },
  vault: {
    eyebrow: "Assurance · audit trail",
    title: "ESG Evidence Vault",
    subtitle:
      "Traceable, audit-grade evidence behind every disclosed circularity claim — certificates, chain-of-custody and downstream attestations.",
    showWindow: false,
  },
  reporting: {
    eyebrow: "Generative · disclosure drafting",
    title: "AI ESG Reporting",
    subtitle:
      "Draft framework-aligned disclosure narratives from the live figures, grounded in the data and mapped to GRI 306, ESRS E5 and ISO 14001.",
    showWindow: true,
  },
};

export default function App() {
  const [module, setModule] = useState<ModuleId>("tower");
  const [filters, setFilters] = useState<FiltersType>({ regions: "all", monthsBack: 12 });

  const view = useMemo(() => buildView(DATASET, filters), [filters]);
  const takeBackCtx = useMemo(() => buildTakeBackView(filters.regions).copilotContext, [filters.regions]);
  const evidenceCtx = useMemo(
    () => buildEvidenceView(filters.regions, view.headline).copilotContext,
    [filters.regions, view.headline]
  );

  // route the Copilot's grounding context to whatever module is in focus
  const ctxRef = useRef<Record<string, unknown>>(view.copilotContext);
  ctxRef.current =
    module === "takeback" ? takeBackCtx : module === "vault" ? evidenceCtx : view.copilotContext;
  const getContext = useCallback(() => ctxRef.current, []);

  const t = TITLES[module];

  return (
    <div className="min-h-screen bg-canvas">
      <Header active={module} onSelect={setModule} evidenceCoverage={view.headline.evidenceCoverage} dateLabel="Jul 2026" />

      <main className="mx-auto max-w-[1560px] px-5 py-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-caps text-ink-faint">
              {t.eyebrow}{t.showWindow ? ` · ${view.windowLabel}` : ""}
            </div>
            <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight text-ink">{t.title}</h1>
            <p className="mt-0.5 max-w-2xl text-[13px] leading-snug text-ink-soft">{t.subtitle}</p>
          </div>
          <Filters regions={DATASET.regions} filters={filters} onChange={setFilters} showWindow={t.showWindow} />
        </div>

        <div className="flex flex-col gap-4 xl:flex-row">
          <div className="min-w-0 flex-1">
            {module === "tower" && <ControlTower view={view} />}
            {module === "takeback" && <TakeBackWorkflow regions={filters.regions} />}
            {module === "vault" && <EvidenceVault regions={filters.regions} headline={view.headline} />}
            {module === "reporting" && <ReportingStudio getContext={getContext} />}
          </div>

          <div className="xl:w-[386px] xl:shrink-0">
            <div className="xl:sticky xl:top-[80px] h-[620px] xl:h-[calc(100vh-100px)]">
              <CopilotPanel getContext={getContext} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
