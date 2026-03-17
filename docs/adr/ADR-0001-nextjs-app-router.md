# ADR-0001 — Next.js 14 App Router vs Pages Router

## Status: Accepted

## Contesto
GEO Monitor è un tool interno full-stack che necessita di:
- Server Components per fetch dati lato server senza esporre API keys
- Route Handlers per le API (senza la struttura pages/api/)
- Streaming delle risposte LLM in tempo reale (/run/[id])
- Layout annidati per il pattern stepper dell'onboarding

## Decisione
Usare Next.js App Router (introdotto in Next.js 13, stabile in 14+).

## Alternative considerate
- **Pages Router**: più maturo, più documentazione, ma non supporta React Server Components né streaming nativo.
- **Remix**: ottimo per form e nested routes, ma ecosistema meno integrato con Vercel.
- **SvelteKit**: ottimo DX, ma il team conosce meglio React.

## Conseguenze
- Server Components di default → meno JS nel browser, fetch sicuri server-side
- `use client` solo dove necessario (form interattivi, hooks, state)
- Il file system routing con gruppi `(group)` permette layout separati per onboarding vs dashboard
- Leggera curva di apprendimento per la distinzione server/client components

## Data: 2026-03-17
