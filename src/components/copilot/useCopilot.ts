import { useCallback, useRef, useState } from "react";
import { streamCopilot } from "../../lib/sse";

export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
  meta?: { model?: string; latencyMs?: number; error?: boolean; code?: string };
}

export function useCopilot(getContext: () => Record<string, unknown>) {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const historyRef = useRef<CopilotMessage[]>([]);

  const ask = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || loading) return;

      // history is the prior turns; the current question is sent separately
      const priorHistory = historyRef.current
        .slice(-6)
        .filter((m) => !m.meta?.error)
        .map((m) => ({ role: m.role, content: m.content }));

      const userMsg: CopilotMessage = { role: "user", content: q };
      setMessages((m) => [...m, userMsg, { role: "assistant", content: "" }]);
      historyRef.current = [...historyRef.current, userMsg];
      setLoading(true);

      const updateLast = (patch: Partial<CopilotMessage>) =>
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { ...copy[copy.length - 1], ...patch };
          return copy;
        });

      let acc = "";
      let meta: CopilotMessage["meta"] = {};
      let errored = false;

      await streamCopilot(
        { question: q, dataContext: getContext(), history: priorHistory },
        {
          onDelta: (t) => {
            acc += t;
            updateLast({ content: acc });
          },
          onMeta: (mm) => {
            meta = mm;
          },
          onError: (e, code) => {
            errored = true;
            updateLast({ content: e, meta: { error: true, code } });
          },
        }
      );

      if (!errored) {
        const asst: CopilotMessage = { role: "assistant", content: acc || "(empty response)", meta };
        updateLast(asst);
        historyRef.current = [...historyRef.current, asst];
      }
      setLoading(false);
    },
    [getContext, loading]
  );

  const reset = useCallback(() => {
    setMessages([]);
    historyRef.current = [];
  }, []);

  return { messages, ask, loading, reset };
}
