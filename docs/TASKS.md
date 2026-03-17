# Tasks — GEO Monitor

## In Progress

## Done

- [x] TASK-001 — Setup progetto Next.js + Drizzle + Neon
  - Next.js App Router + TypeScript + Tailwind
  - Drizzle ORM con schema brands/queries/reports/categories
  - Neon Postgres driver serverless

- [x] TASK-002 — CRUD brand (dashboard + /brands/new)
  - Dashboard `/dashboard` con griglia brand card
  - Onboarding 4 step `/brands/new`
  - API CRUD `/api/brands`

- [x] TASK-004 — LLM proxy layer
  - OpenAI GPT-4o primario (`src/features/llm-analysis/providers/openai.ts`)
  - Stub Claude (`anthropic.ts`) — attivo se `ANTHROPIC_API_KEY` presente
  - Stub Gemini (`gemini.ts`) — attivo se `GEMINI_API_KEY` presente
  - Router unificato (`router.ts`)

- [x] TASK-005 — Onboarding: site-analyze + query generation
  - `/api/site-analyze` → analisi sito con OpenAI
  - `/api/llm/generate-queries` → generazione prompt per categoria
  - 4 step: Brand Analysis → Review → Loading → Test Visibility

- [x] TASK-006 — Run analisi live (/run/[id])
  - Streaming Server-Sent Events per risultati in tempo reale
  - Progress bar con query corrente e LLM corrente
  - Redirect a `/brands/[id]` al termine con toast

- [x] TASK-007 — Salvataggio report su DB
  - `POST /api/brands/[id]/reports` salva batch report
  - Estrazione competitor via `/api/llm/extract-competitors`

- [x] TASK-008 — Dashboard brand con storico e tab competitor
  - Tab Overview (4 metric card)
  - Tab Storico (tabella con trend)
  - Tab Competitor (bar chart)
  - Tab Query (lista con toggle)

- [x] TASK-009 — Export PDF
  - PDF client-side con jsPDF
  - Header, metric card, competitor chart, tabella risposte

- [x] TASK-010 — Test Vitest
  - `metrics.test.ts` per logica KPI pura
  - `providers.test.ts` per router LLM

## Backlog

- [ ] TASK-011 — Aggiungere NextAuth se il tool diventa pubblico (vedi ADR-0003)
- [ ] TASK-012 — Perplexity API come provider aggiuntivo (web-native, più accurato per GEO)
- [ ] TASK-013 — Trend chart sparkline per storico brand (recharts o chart.js)
- [ ] TASK-014 — Notifiche Slack/email quando il mention rate scende sotto soglia
- [ ] TASK-015 — Analisi schedulata automatica (cron job via Vercel Cron)
- [ ] TASK-016 — Confronto between-run (delta mention rate nel tempo)
- [ ] TASK-017 — Export CSV dei report
- [ ] TASK-018 — Multi-lingua UI (i18n)
