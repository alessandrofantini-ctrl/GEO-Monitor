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

- [x] TASK-015 — Analisi schedulata automatica (Vercel Cron ogni lunedì)
  - `vercel.json` con cron `0 9 * * 1`
  - `GET /api/cron/run-scheduled` con auth Bearer `CRON_SECRET`
  - Aggiunta colonne `scheduled_at` e `triggered_by` alla tabella `runs`
  - Aggiunta colonne `schedule_enabled` e `schedule_frequency` alla tabella `brands`
  - Toggle monitoraggio automatico nel tab Query della dashboard brand

- [x] TASK-016 — Trend storico KPI con sparkline e delta vs run precedente
  - Nuova tabella `brand_snapshots` salvata dopo ogni analisi
  - Tab Storico ridisegnato: 3 card KPI con delta + sparkline SVG inline
  - Card per ogni run con badge Manuale/Schedulato + expand inline report

- [x] TASK-019 — Raccomandazioni AI nel PDF (GPT-4o basato su dati reali)
  - `GET /api/brands/[id]/recommendations` genera 4 raccomandazioni actionable
  - Analizza mention rate, trend, competitor, query mancanti
  - Risposta JSON: summary + array recommendations

- [x] TASK-020 — PDF professionale: executive summary + trend + raccomandazioni
  - Pagina 1: header scuro, 4 metric card con delta, trend testuale + sparkline, raccomandazioni AI
  - Pagina 2: competitor bar chart (max 10)
  - Pagina 3+: tabella completa risposte LLM
  - Export PDF chiama prima `/api/brands/[id]/recommendations` poi genera PDF

## Backlog

- [ ] TASK-011 — Aggiungere NextAuth se il tool diventa pubblico (vedi ADR-0003)
- [ ] TASK-012 — Perplexity API come provider aggiuntivo (web-native, più accurato per GEO)
- [ ] TASK-014 — Notifiche Slack/email quando il mention rate scende sotto soglia
- [ ] TASK-017 — Export CSV dei report
- [ ] TASK-018 — Multi-lingua UI (i18n)
