# ADR-0004 — OpenAI come provider primario, altri come stub

## Status: Accepted

## Contesto
GEO Monitor deve:
1. Analizzare siti web (site-analyze) — richiede ragionamento + web search
2. Generare query di ricerca realistiche (generate-queries)
3. Eseguire le query su LLM per misurare la visibilità del brand
4. Estrarre competitor dal testo di risposta

Il tool misura la visibilità su ChatGPT, Claude, Gemini — ma le API per "rispondere come farebbe l'utente finale" sono diverse dalle API di completamento standard.

## Decisione
- **OpenAI GPT-4o** come provider primario per tutte le operazioni interne (site-analyze, generate-queries, extract-competitors)
- **Claude (Anthropic) e Gemini** come stub attivabili via env var — implementazione presente ma richiede API key
- Provider centralizzato in `src/features/llm-analysis/providers/` con router unico

## Alternative considerate
- **Anthropic Claude come primario**: ottima qualità, ma API meno mature per web search integrato.
- **Gemini come primario**: gratis tier generoso, ma qualità inferiore su task di analisi brand.
- **Multi-provider da subito**: aggiunge complessità di gestione errori e fallback senza beneficio immediato.
- **LangChain**: astrazione eccessiva per le chiamate dirette di questo tool.

## Conseguenze
- `OPENAI_API_KEY` è l'unica env var obbligatoria per il funzionamento
- `ANTHROPIC_API_KEY` e `GEMINI_API_KEY` sblocano provider aggiuntivi nel UI
- Il frontend mostra i toggle LLM come disabilitati se la key non è configurata
- Costo: GPT-4o a ~$0.01/1K token — per uso interno accettabile
- Futura estensione: aggiungere Perplexity API (web-native) per `run` con risultati più accurati

## Data: 2026-03-17
