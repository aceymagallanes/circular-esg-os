// Reads the /api/copilot Server-Sent-Events stream (delta / meta / error).

export interface CopilotStreamHandlers {
  onDelta: (text: string) => void;
  onMeta?: (meta: { model?: string; latencyMs?: number }) => void;
  onError?: (error: string, code?: string) => void;
}

export async function streamCopilot(payload: unknown, h: CopilotStreamHandlers): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    h.onError?.("Network error reaching the Copilot service.");
    return;
  }
  if (!res.ok || !res.body) {
    h.onError?.(`The Copilot request failed (HTTP ${res.status}).`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const chunk = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const line = chunk.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      let evt: any;
      try {
        evt = JSON.parse(data);
      } catch {
        continue;
      }
      if (evt.type === "delta") h.onDelta(evt.text || "");
      else if (evt.type === "meta") h.onMeta?.({ model: evt.model, latencyMs: evt.latencyMs });
      else if (evt.type === "error") h.onError?.(evt.error, evt.code);
    }
  }
}
