# ADR-0003 — Nessuna autenticazione — tool interno, accesso diretto senza login

## Status: Accepted

## Contesto
GEO Monitor è un tool interno per un'agenzia. Non è un SaaS pubblico.
L'isolamento avviene a livello infrastrutturale (Vercel deploy privato o Vercel Password Protection).

## Decisione
Nessun sistema di autenticazione. Zero middleware di protezione route. Tutte le pagine e API sono accessibili direttamente.

## Alternative considerate
- **NextAuth.js**: il candidato naturale per auth in Next.js, ma aggiunge: sessioni, JWT, tabelle DB aggiuntive (users, sessions, accounts), e pagine di login — overhead ingiustificato per un tool interno.
- **Clerk**: ottima DX, auth pronta in 10 minuti, ma costo mensile e dipendenza da terze parti per un tool interno.
- **Basic Auth via middleware**: semplice, ma gestisce solo browser — non funziona bene con le API route chiamate dal codice.
- **Vercel Password Protection**: disponibile sui piani Pro, protezione a livello CDN senza modifiche al codice.

## Conseguenze
- Zero setup auth → deploy immediato senza configurare provider OAuth
- Se in futuro si apre a utenti esterni: aggiungere NextAuth con provider email/OAuth (vedi TASKS.md backlog)
- Il campo `userId` è assente da tutte le tabelle — aggiornamento schema richiesto se si introduce multi-tenancy
- Isolamento consigliato: deploy su Vercel con `vercel --prod` su progetto privato, oppure aggiungere Vercel Password Protection dal dashboard

## Data: 2026-03-17
