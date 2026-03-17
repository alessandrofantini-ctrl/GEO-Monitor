# GEO Monitor — Architecture

## Scopo
Tool interno per agenzie per misurare la visibilità di un brand nelle risposte degli LLM (ChatGPT, Claude, Gemini). Ispirato a RankPrompt.com.

## Flusso dati

```mermaid
graph TD
    U[Utente Browser] --> A[Next.js App Router]
    A --> B[/api/site-analyze]
    A --> C[/api/llm/generate-queries]
    A --> D[/api/llm/run]
    A --> E[/api/brands CRUD]
    A --> F[/api/brands/[id]/reports]

    B --> G[OpenAI GPT-4o]
    C --> G
    D --> G
    D --> H[Anthropic Claude stub]
    D --> I[Gemini stub]

    E --> J[(Neon Postgres)]
    F --> J

    D --> K[/api/llm/extract-competitors]
    K --> G
```

## Struttura slice

| Slice | Path | Responsabilità |
|---|---|---|
| brands | `src/features/brands/` | Tipi brand, validazione, helpers |
| llm-analysis | `src/features/llm-analysis/` | Provider LLM, metrics, mention detection |
| competitor-discovery | `src/features/competitor-discovery/` | Estrazione competitor dal testo |
| reports | `src/features/reports/` | Aggregazione e trasformazione report |
| pdf-export | `src/features/pdf-export/` | Generazione PDF client-side con jsPDF |

## Struttura directory

```
src/
├── features/
│   ├── brands/
│   │   └── types.ts
│   ├── llm-analysis/
│   │   ├── providers/
│   │   │   ├── openai.ts
│   │   │   ├── anthropic.ts
│   │   │   ├── gemini.ts
│   │   │   └── router.ts
│   │   ├── metrics.ts
│   │   └── metrics.test.ts
│   ├── competitor-discovery/
│   │   └── extract.ts
│   ├── reports/
│   │   └── aggregate.ts
│   └── pdf-export/
│       └── generatePDF.ts
├── app/
│   ├── page.tsx                    ← redirect a /dashboard
│   ├── layout.tsx
│   ├── dashboard/page.tsx
│   ├── brands/
│   │   ├── new/page.tsx            ← onboarding 4 step
│   │   └── [id]/page.tsx           ← dashboard brand
│   ├── run/[id]/page.tsx           ← analisi live
│   ├── reports/page.tsx
│   └── api/
│       ├── site-analyze/route.ts
│       ├── llm/
│       │   ├── generate-queries/route.ts
│       │   ├── run/route.ts
│       │   └── extract-competitors/route.ts
│       └── brands/
│           ├── route.ts
│           └── [id]/
│               ├── queries/route.ts
│               └── reports/route.ts
├── components/ui/
│   ├── MetricCard.tsx
│   ├── BrandCard.tsx
│   ├── LLMBadge.tsx
│   ├── StatusBadge.tsx
│   ├── CompetitorBar.tsx
│   ├── ProgressBar.tsx
│   └── StepIndicator.tsx
└── lib/
    ├── db/
    │   ├── index.ts
    │   └── schema.ts
    └── utils.ts
docs/
├── adr/
│   ├── ADR-0001-nextjs-app-router.md
│   ├── ADR-0002-neon-postgres.md
│   ├── ADR-0003-no-auth.md
│   └── ADR-0004-openai-primary.md
├── ARCHITECTURE.md
└── TASKS.md
```

## Environment Variables

| Variabile | Obbligatoria | Descrizione |
|---|---|---|
| `DATABASE_URL` | Sì | Neon Postgres connection string (`postgresql://...`) |
| `OPENAI_API_KEY` | Sì | OpenAI API key — provider primario |
| `ANTHROPIC_API_KEY` | No | Sblocca provider Claude nel UI |
| `GEMINI_API_KEY` | No | Sblocca provider Gemini nel UI |

## ADR Index

- [ADR-0001](adr/ADR-0001-nextjs-app-router.md) — Next.js App Router vs Pages Router
- [ADR-0002](adr/ADR-0002-neon-postgres.md) — Neon Postgres vs Vercel KV vs SQLite
- [ADR-0003](adr/ADR-0003-no-auth.md) — Nessuna autenticazione
- [ADR-0004](adr/ADR-0004-openai-primary.md) — OpenAI come provider primario

## Decisioni di design chiave

1. **Vertical slice**: il codice è organizzato per dominio funzionale, non per tipo di file. Ogni feature è autocontenuta.
2. **No auth** (ADR-0003): accesso diretto, isolamento via Vercel Privacy o Password Protection.
3. **Drizzle ORM**: type-safe, zero codegen runtime, ottimo per serverless.
4. **Mention detection**: controlla brand name + tutti gli alias per non perdere menzioni con nomi alternativi.
5. **PDF client-side**: jsPDF genera il PDF nel browser → nessuna dipendenza server per l'export.
