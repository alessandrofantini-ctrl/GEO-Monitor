# ADR-0002 — Neon Postgres vs Vercel KV vs SQLite

## Status: Accepted

## Contesto
Il tool deve persistere: brand, query, report (con competitors come JSONB), categorie.
I dati sono relazionali (brand → query → report). Deploy su Vercel con serverless functions.

## Decisione
Neon Postgres con Drizzle ORM come query builder type-safe.

Motivi:
- Neon offre un free tier serverless PostgreSQL ottimizzato per Vercel
- Le query SQL relazionali sono più adatte di un KV store per i report aggregati
- Drizzle ORM è type-safe, leggero, senza overhead (niente Prisma client engine)
- Il driver `@neondatabase/serverless` usa WebSocket per connessioni HTTP-compatible in edge/serverless

## Alternative considerate
- **Vercel KV (Redis)**: ottimo per session/cache, ma inadatto per query relazionali complesse (aggregazioni competitor, storico per brand).
- **SQLite (Turso)**: zero costo, latenza bassa, ma non supporta JSONB nativo e le query cross-region su Vercel edge sarebbero complesse.
- **PlanetScale (MySQL)**: buona scalabilità, ma lo schema branching aggiunge complessità non necessaria per un tool interno.
- **Prisma + Postgres**: più magico ma il Prisma engine pesa ~40MB, problematico in edge functions.

## Conseguenze
- `DATABASE_URL` obbligatorio come env var (vedi ARCHITECTURE.md)
- Schema definito in `src/lib/db/schema.ts` con Drizzle
- Migrations gestite con `drizzle-kit generate` + `drizzle-kit migrate`
- JSONB per `competitors` nel report — evita tabella separata per un dato che non richiede query complesse

## Data: 2026-03-17
