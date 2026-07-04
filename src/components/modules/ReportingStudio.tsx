import { useState } from "react";
import { streamCopilot } from "../../lib/sse";

interface Section {
  key: string;
  label: string;
  eyebrow: string;
  prompt: string;
}

const SECTIONS: Section[] = [
  {
    key: "exec",
    label: "Board executive summary",
    eyebrow: "For the sustainability steering committee",
    prompt:
      "Draft a board-level executive summary of our circular-economy performance this period (one tight paragraph), then 3 bullet highlights and 2 risks/watch-items. Ground every figure in the data.",
  },
  {
    key: "gri306",
    label: "GRI 306 — Waste disclosure",
    eyebrow: "Global Reporting Initiative",
    prompt:
      "Draft the GRI 306 (Waste) disclosure narrative for this reporting period. Cover 306-3 (waste generated), 306-4 (waste diverted from disposal, by recovery operation — reuse/refurbish/harvest/recycle), and 306-5 (waste directed to disposal). Use our disposition mix, tonnages and diversion rate. Add a short methodology note and flag any data-quality caveats.",
  },
  {
    key: "esrsE5",
    label: "ESRS E5 — Circular economy",
    eyebrow: "EU CSRD / ESRS",
    prompt:
      "Draft the ESRS E5 (Resource use & circular economy) disclosure narrative. Address resource outflows, circularity/second-life rate, secondary materials recovered and returned to supply, CO₂e avoided, and performance against our circular-economy target. Reference our figures and note the assurance evidence coverage.",
  },
];

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-semibold text-ink">{p.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

function Rendered({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const t = line.trim();
        if (/^#{1,3}\s+/.test(t)) return <h4 key={i} className="pt-1 font-display text-[13.5px] font-semibold text-ink"><Inline text={t.replace(/^#{1,3}\s+/, "")} /></h4>;
        if (/^[-•*]\s+/.test(t)) return (
          <div key={i} className="flex gap-2 pl-1"><span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-teal" /><span className="text-[12.5px] leading-relaxed text-ink-soft"><Inline text={t.replace(/^[-•*]\s+/, "")} /></span></div>
        );
        return <p key={i} className="text-[12.5px] leading-relaxed text-ink-soft"><Inline text={t} /></p>;
      })}
    </div>
  );
}

export function ReportingStudio({ getContext }: { getContext: () => Record<string, unknown> }) {
  const [results, setResults] = useState<Record<string, { text?: string; loading?: boolean; error?: string; model?: string }>>({});

  const generate = async (s: Section) => {
    setResults((r) => ({ ...r, [s.key]: { loading: true, text: "" } }));
    const patch = (p: Record<string, unknown>) =>
      setResults((r) => ({ ...r, [s.key]: { ...r[s.key], ...p } }));
    let acc = "";
    await streamCopilot(
      { question: s.prompt, dataContext: getContext(), history: [] },
      {
        onDelta: (t) => {
          acc += t;
          patch({ text: acc });
        },
        onMeta: (mm) => patch({ model: mm.model }),
        onError: (e) => patch({ error: e }),
      }
    );
    patch({ loading: false });
  };

  const copy = (text: string) => navigator.clipboard?.writeText(text);

  return (
    <div className="space-y-4">
      <div className="rounded-xl2 border border-line bg-gradient-to-br from-teal-deep to-teal px-6 py-5 text-white shadow-panel">
        <div className="font-mono text-[10px] uppercase tracking-caps text-white/70">AI ESG Reporting Copilot · powered by Claude Opus 4.8</div>
        <h2 className="mt-1 font-display text-[22px] font-bold leading-tight">Disclosure drafting studio</h2>
        <p className="mt-1 max-w-2xl text-[13px] leading-snug text-white/85">
          Generate audit-ready, framework-aligned disclosure narratives from the live Control Tower figures. Every draft is
          grounded in the current data, cites the numbers, and flags evidence caveats — ready for the committee to review.
        </p>
      </div>

      <div className="space-y-4">
        {SECTIONS.map((s) => {
          const r = results[s.key] || {};
          return (
            <section key={s.key} className="rounded-xl2 border border-line bg-canvas-panel shadow-panel">
              <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-caps text-ink-faint">{s.eyebrow}</div>
                  <h3 className="font-display text-[15px] font-semibold text-ink">{s.label}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {r.text && (
                    <button onClick={() => copy(r.text!)} className="rounded-md border border-line px-2.5 py-1 text-[11px] text-ink-soft hover:bg-canvas-sunken">
                      Copy
                    </button>
                  )}
                  <button
                    onClick={() => generate(s)}
                    disabled={r.loading}
                    className="rounded-lg bg-teal px-3 py-1.5 text-[12px] font-medium text-white hover:bg-teal-deep disabled:opacity-50"
                  >
                    {r.loading ? "Drafting…" : r.text ? "Regenerate" : "Generate draft"}
                  </button>
                </div>
              </header>
              <div className="px-5 py-4">
                {r.loading && !r.text && (
                  <div className="flex items-center gap-2 text-[12px] text-ink-faint">
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal animate-blink" />
                      <span className="h-1.5 w-1.5 rounded-full bg-teal animate-blink" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-teal animate-blink" style={{ animationDelay: "300ms" }} />
                    </span>
                    Claude is drafting from the live figures…
                  </div>
                )}
                {r.error && <p className="rounded-lg border border-signal/40 bg-signal/5 px-3 py-2 text-[12px] text-ink-soft">{r.error}</p>}
                {r.text && <Rendered text={r.text} />}
                {!r.loading && !r.error && !r.text && (
                  <p className="text-[12px] text-ink-faint">Click <span className="font-medium text-ink-soft">Generate draft</span> to have the Copilot write this disclosure section from the current data.</p>
                )}
                {r.model && <div className="mt-3 font-mono text-[9px] text-ink-faint">{r.model}</div>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
