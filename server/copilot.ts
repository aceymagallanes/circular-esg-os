import type { Plugin, Connect } from "vite";
import type { ServerResponse } from "node:http";
import { SYSTEM_PROMPT, MODEL, MAX_TOKENS, buildMessages, rateLimit } from "./shared";

/**
 * Vite dev-server plugin exposing POST /api/copilot as an SSE stream — mirrors
 * the deployed Edge function (api/copilot.ts) so local dev behaves like prod.
 * The ANTHROPIC_API_KEY stays on the Node side and never reaches the browser.
 */

function readJson(req: Connect.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

export function copilotPlugin(apiKey?: string): Plugin {
  return {
    name: "esg-copilot-api",
    configureServer(server) {
      server.middlewares.use("/api/copilot", async (req, res: ServerResponse) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method not allowed");
          return;
        }
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        const send = (o: Record<string, unknown>) => res.write(`data: ${JSON.stringify(o)}\n\n`);
        const done = () => {
          res.write("data: [DONE]\n\n");
          res.end();
        };

        if (!apiKey) {
          send({
            type: "error",
            code: "NO_KEY",
            error:
              "No ANTHROPIC_API_KEY found. Copy .env.example to .env, paste your key, and restart the dev server to enable the live Copilot.",
          });
          done();
          return;
        }

        const ip =
          (req.headers["x-forwarded-for"]?.toString().split(",")[0] || "").trim() ||
          req.socket?.remoteAddress ||
          "local";
        const rl = rateLimit(ip);
        if (!rl.ok) {
          send({ type: "error", code: "RATE_LIMIT", error: `Usage limit reached — please wait ${rl.retryAfter}s.` });
          done();
          return;
        }

        try {
          const body = await readJson(req);
          const messages = buildMessages(body.question, body.dataContext, body.history);
          const { default: Anthropic } = await import("@anthropic-ai/sdk");
          const client = new Anthropic({ apiKey });
          const t0 = Date.now();

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
        }
        done();
      });
    },
  };
}
