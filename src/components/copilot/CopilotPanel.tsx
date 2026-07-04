import { useEffect, useRef, useState } from "react";
import { useCopilot, type CopilotMessage } from "./useCopilot";

const PRESETS = [
  "What's the single biggest driver of our circularity rate this period, and where is the upside?",
  "Explain the flagged anomaly in landfill diversion and what I should check.",
  "Draft the CO₂e-avoided narrative for our ESRS E5 disclosure.",
  "Which region is underperforming on circularity, and why?",
];

function Inline({ text }: { text: string }) {
  // minimal **bold** parsing
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-semibold text-ink">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

function Markdownish({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const t = line.trim();
        if (/^[-•*]\s+/.test(t)) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-hp" />
              <span className="text-[12.5px] leading-relaxed text-ink-soft">
                <Inline text={t.replace(/^[-•*]\s+/, "")} />
              </span>
            </div>
          );
        }
        if (/^\d+\.\s+/.test(t)) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="font-mono text-[11px] text-hp">{t.match(/^\d+/)?.[0]}.</span>
              <span className="text-[12.5px] leading-relaxed text-ink-soft">
                <Inline text={t.replace(/^\d+\.\s+/, "")} />
              </span>
            </div>
          );
        }
        return (
          <p key={i} className="text-[12.5px] leading-relaxed text-ink-soft">
            <Inline text={t} />
          </p>
        );
      })}
    </div>
  );
}

function Bubble({ m }: { m: CopilotMessage }) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[92%] rounded-2xl rounded-br-sm bg-ink px-3.5 py-2 text-[12.5px] leading-snug text-white">
          {m.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <div className={`rounded-2xl rounded-bl-sm border px-3.5 py-2.5 ${m.meta?.error ? "border-signal/40 bg-signal/5" : "border-line bg-canvas"}`}>
        {m.meta?.error ? (
          <p className="text-[12px] leading-relaxed text-ink-soft">{m.content}</p>
        ) : (
          <Markdownish text={m.content} />
        )}
      </div>
      {m.meta?.model && (
        <div className="pl-1 font-mono text-[9px] text-ink-faint">
          {m.meta.model} · {m.meta.latencyMs ? (m.meta.latencyMs / 1000).toFixed(1) + "s" : ""}
        </div>
      )}
    </div>
  );
}

export function CopilotPanel({ getContext }: { getContext: () => Record<string, unknown> }) {
  const { messages, ask, loading, reset } = useCopilot(getContext);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const submit = () => {
    if (!input.trim()) return;
    ask(input);
    setInput("");
  };

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-xl2 border border-line bg-canvas-panel shadow-panel">
      {/* header */}
      <div className="flex items-center justify-between border-b border-line bg-gradient-to-r from-teal-deep to-teal px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/15 ring-1 ring-white/25">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M12 3v18M5.5 7.5l13 9M18.5 7.5l-13 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="12" cy="12" r="2.4" fill="currentColor" />
            </svg>
          </div>
          <div>
            <div className="text-[13px] font-semibold leading-tight text-white">ESG Reporting Copilot</div>
            <div className="font-mono text-[9px] tracking-caps text-white/70">POWERED BY CLAUDE OPUS 4.8</div>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={reset} className="rounded-md px-2 py-1 text-[10px] text-white/80 hover:bg-white/10">
            Clear
          </button>
        )}
      </div>

      {/* conversation */}
      <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-[12.5px] leading-relaxed text-ink-soft">
              I analyse the <span className="font-medium text-ink">figures currently on screen</span> and respond as your
              circular-economy analyst — grounded in the data and aligned to GRI 306, ESRS E5 and ISO 14001. Select a
              prompt below or ask your own:
            </p>
            <div className="space-y-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => ask(p)}
                  className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-left text-[12px] leading-snug text-ink-soft transition-colors hover:border-teal/40 hover:bg-teal/5 hover:text-ink"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <Bubble key={i} m={m} />
        ))}

        {loading && !messages[messages.length - 1]?.content && (
          <div className="flex items-center gap-2 pl-1 text-[11px] text-ink-faint">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-teal animate-blink" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-teal animate-blink" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-teal animate-blink" style={{ animationDelay: "300ms" }} />
            </span>
            analysing current figures…
          </div>
        )}
      </div>

      {/* input */}
      <div className="border-t border-line p-3">
        <div className="flex items-end gap-2 rounded-xl border border-line bg-canvas px-3 py-2 focus-within:border-teal/50">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Ask about the current figures…"
            className="max-h-28 flex-1 resize-none bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-faint"
          />
          <button
            onClick={submit}
            disabled={loading || !input.trim()}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-teal text-white transition-colors hover:bg-teal-deep disabled:opacity-40"
            aria-label="Send"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="mt-1.5 px-1 font-mono text-[9px] text-ink-faint">
          Responses reflect the region and window filters currently applied.
        </div>
      </div>
    </aside>
  );
}
