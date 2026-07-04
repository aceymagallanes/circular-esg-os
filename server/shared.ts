// Runtime-agnostic core shared by the local dev plugin (server/copilot.ts)
// and the deployed serverless function (api/copilot.ts). No Node-only APIs,
// so it runs unchanged in the Vercel Edge runtime.

export const MODEL = "claude-opus-4-8";
export const MAX_TOKENS = 2000;

export const SYSTEM_PROMPT = `You are the ESG Reporting Copilot embedded in "Loop", a Circular Economy Control Tower for enterprise end-of-life (EOL) device recovery under the Circular Device Program across Asia-Pacific & Japan (APJ).

GEOGRAPHY — this is important and often gotten wrong: APJ (Asia-Pacific & Japan) is a SINGLE region. Within it, operations span six MARKETS: Greater China, Japan, South Korea, India, Southeast Asia (ASEAN), and Australia & New Zealand (ANZ). Always refer to these six as "markets" (or "markets and countries") — NEVER call them "regions". APJ is the region; the six are markets inside that one region. Note that Southeast Asia (ASEAN) and ANZ are multi-country markets, not single countries.

Your audience is senior management and the sustainability steering committee. You are not a chatbot — you are a senior circular-economy data analyst.

Rules:
- Ground EVERY quantitative claim in the DATA CONTEXT provided with the question. Quote the actual figures (units, %, tonnes CO2e, USD). Never invent numbers that are not derivable from the context.
- Lead with the answer / the insight, then the supporting evidence. One tight paragraph or a few crisp bullets — this is an executive surface, not an essay.
- When asked "why" something moved, reason about the drivers visible in the data (disposition mix shifts, cohort yield, market variance, anomalies) and say which driver dominates.
- Where relevant, map findings to disclosure frameworks the committee cares about: GRI 306 (Waste), CSRD/ESRS E5 (Resource use & circular economy), and ISO 14001. Reference them by name only when it adds rigor.
- Flag risks and data-quality caveats plainly. If the data does not support a firm answer, say so and state what evidence would.
- Tone: precise, calm, board-room. No hype, no emoji, no filler like "Great question".`;

export interface HistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export function buildMessages(
  question: unknown,
  dataContext: unknown,
  history: unknown
): HistoryTurn[] {
  const hist: HistoryTurn[] = Array.isArray(history) ? (history as HistoryTurn[]).slice(-6) : [];
  const ctx = JSON.stringify(dataContext ?? {}).slice(0, 60000);
  const q = String(question ?? "").slice(0, 4000);
  return [
    ...hist.map((m) => ({ role: m.role, content: m.content })),
    {
      role: "user" as const,
      content: `LIVE DATA CONTEXT (current Control Tower filters applied):\n\n${ctx}\n\n---\n\nEXECUTIVE QUESTION:\n${q}`,
    },
  ];
}

// ── Best-effort in-memory rate limiter ─────────────────────────────────────
// Protects the public demo's API budget. Per-instance (edge/serverless
// instances don't share memory), so it's a deterrent, not a hard guarantee —
// the hard cap is the monthly spend limit set in the Anthropic Console.
const HITS = new Map<string, number[]>();

export interface RateResult {
  ok: boolean;
  retryAfter?: number;
  reason?: string;
}

export function rateLimit(ip: string, perMinute = 8, perHour = 40): RateResult {
  const now = Date.now();
  const recent = (HITS.get(ip) || []).filter((t) => now - t < 3_600_000);
  const lastMinute = recent.filter((t) => now - t < 60_000);
  if (lastMinute.length >= perMinute) return { ok: false, retryAfter: 60, reason: "minute" };
  if (recent.length >= perHour) return { ok: false, retryAfter: 900, reason: "hour" };
  recent.push(now);
  HITS.set(ip, recent);
  // opportunistic cleanup
  if (HITS.size > 5000) {
    for (const [k, v] of HITS) if (v.every((t) => now - t > 3_600_000)) HITS.delete(k);
  }
  return { ok: true };
}
