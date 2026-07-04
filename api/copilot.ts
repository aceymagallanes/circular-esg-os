import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, MODEL, MAX_TOKENS, buildMessages, rateLimit } from "../server/shared";

// Vercel Edge runtime — streams tokens back over SSE.
export const config = { runtime: "edge" };

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

function once(payload: Record<string, unknown>): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(enc.encode(`data: ${JSON.stringify(payload)}\n\n`));
      c.enqueue(enc.encode("data: [DONE]\n\n"));
      c.close();
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return once({ type: "error", error: "The Copilot is not configured on this deployment.", code: "NO_KEY" });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const rl = rateLimit(ip);
  if (!rl.ok) {
    return once({
      type: "error",
      code: "RATE_LIMIT",
      error: `Usage limit reached — please wait ${rl.retryAfter}s. This is a public demo with per-visitor limits to protect the API budget.`,
    });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* empty body tolerated */
  }
  const messages = buildMessages(body.question, body.dataContext, body.history);
  const client = new Anthropic({ apiKey });
  const enc = new TextEncoder();
  const t0 = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: Record<string, unknown>) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`));
      try {
        const s = client.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          thinking: { type: "adaptive" },
          output_config: { effort: "medium" },
          system: SYSTEM_PROMPT,
          messages,
        } as any);

        for await (const event of s as any) {
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
            send({ type: "delta", text: event.delta.text });
          }
        }
        const final = await s.finalMessage();
        send({ type: "meta", model: final.model, latencyMs: Date.now() - t0 });
      } catch (e: any) {
        send({ type: "error", error: e?.message || "The Copilot request failed." });
      } finally {
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
