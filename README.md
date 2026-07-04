# Loop — Circular Economy Operating System

An AI-powered **ESG & circular economy control tower**, built as a working replica of how **HP manages its end-of-life (EOL) device recovery** across Asia-Pacific & Japan under the *HP Planet Partners* program.

This first release ships the **Circular Economy Control Tower** — the executive home of a four-module system — with an embedded **AI ESG Reporting Copilot wired to the live Claude API**.

> Portfolio project by Acey Magallanes — AI Automation · Business Transformation · Sustainability & Circular Economy.

---

## What's inside

**Executive KPI strip** — units recovered, circularity rate, landfill diversion, materials recovered, CO₂e avoided, and recovery value; each with trend vs. the prior equivalent window, a sparkline, and a data-derived insight caption.

**Data-scientist-grade visuals** (all recompute live against the active region & window filters):

| Panel | What it shows |
|---|---|
| **Material-flow Sankey** | Device family → recovery pathway → certified material stream |
| **Circularity forecast** | OLS trend + 6-month projection with a 95% prediction interval |
| **CO₂e waterfall** | Attribution of net avoided emissions by pathway, incl. disposal leakage |
| **Cohort yield matrix** | Second-life recovery yield by device model × age band |
| **APJ network map** | Collection regions → certified recovery hubs, sized by volume, coloured by circularity |
| **Anomaly control chart** | ±2σ scan on landfill diversion that flags a supply-chain disruption |

**AI ESG Reporting Copilot** — ask executive questions ("What's the biggest driver of our circularity rate?", "Explain the flagged anomaly", "Draft the ESRS E5 narrative"). It reads the **live figures currently on screen** and answers as a senior circular-economy analyst, grounded in the numbers and mapped to **GRI 306 / ESRS E5 / ISO 14001**.

---

## Run it

Requires Node 20+.

```bash
npm install
npm run dev          # → http://localhost:5173
```

### Enable the live Copilot

The Copilot calls the real Claude API through a **server-side proxy** (`server/copilot.ts`), so your key never reaches the browser bundle.

```bash
cp .env.example .env
# edit .env → ANTHROPIC_API_KEY=sk-ant-...
npm run dev          # restart to pick up the key
```

Without a key, the dashboard runs fully and the Copilot shows a friendly "add your key" prompt.

---

## Architecture

- **Vite + React + TypeScript + Tailwind** — fast, single-process dev.
- **`src/data/`** — a deterministic, internally consistent mock HP EOL dataset: 10 device models × 6 APJ regions × 24 months of atomic records, with realistic material composition, recovery economics, and an injected logistics disruption so the anomaly detector has a real signal.
- **`src/data/selectors.ts`** — the aggregation engine: one shared "data spine" turns the atomic table + filters into every chart, and into the compact context handed to the Copilot.
- **Copilot API** — `POST /api/copilot` streams tokens back over SSE. Two entry points share one core (`server/shared.ts`): `server/copilot.ts` (Vite dev-server plugin) for local, and `api/copilot.ts` (Vercel Edge function) for production. Calls `claude-opus-4-8` with adaptive thinking; the API key stays server-side and never reaches the browser.
- **Charts** are hand-built SVG on `d3-scale` / `d3-shape` / `d3-sankey` — full control over the analytics and the aesthetic.

---

## The four modules

Navigate between them from the top bar; the AI Copilot rail stays docked and re-grounds itself on whichever module is in focus. All four share one data spine.

| Module | What it does |
|---|---|
| **Circular Economy Control Tower** | Executive analytics home — KPIs, Sankey, forecast, waterfall, cohort matrix, network map, anomaly scan |
| **Smart Product Take-Back Workflow** | Live reverse-logistics pipeline (EOL request → collected → triage → graded → dispositioned) with SLA tracking and an AI disposition recommender per batch |
| **ESG Evidence Vault** | Audit-readiness scoring, claim → evidence traceability, and a filterable chain-of-custody / certificate ledger |
| **AI ESG Reporting** | Generative disclosure studio — drafts board summaries and GRI 306 / ESRS E5 narratives from the live data via Claude Opus 4.8 |

## Deploy (Vercel)

The Copilot API is already a serverless **Edge function** (`api/copilot.ts`) with token streaming and cost protection built in, so deployment is a straight import.

1. Push this repo to GitHub.
2. On [vercel.com](https://vercel.com), **Add New → Project → Import** the repo. Vercel auto-detects Vite (build `vite build`, output `dist`) and deploys `api/` as functions.
3. In **Settings → Environment Variables**, add `ANTHROPIC_API_KEY` (Production). Redeploy.
4. Set a **monthly spend limit** in the Anthropic Console — the hard cap that guarantees a public demo can never exceed your budget.

**Cost protection built in:** per-visitor rate limiting (8/min, 40/hr), a bounded `max_tokens`, and the server-side key. The Anthropic spend limit is the ultimate backstop.
