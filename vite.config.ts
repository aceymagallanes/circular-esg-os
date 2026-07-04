import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { copilotPlugin } from "./server/copilot";

export default defineConfig(({ mode }) => {
  // Load .env into a local var (NOT VITE_-prefixed → never bundled to client).
  const env = loadEnv(mode, process.cwd(), "");
  const apiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

  return {
    plugins: [react(), copilotPlugin(apiKey)],
    server: {
      host: true,
      port: 5173,
    },
  };
});
