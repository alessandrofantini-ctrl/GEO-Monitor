// WHY: Vercel Cron chiama questo endpoint ogni settimana
// per ogni brand con schedule attivo, avvia automaticamente una nuova analisi
import { NextResponse } from 'next/server';
import { db, brands, queries, runs, reports, brandSnapshots } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import type { LLMProvider } from '@/features/llm-analysis/providers/router';
import { callLLM } from '@/features/llm-analysis/providers/router';
import { detectMention, detectFirstPosition, calculateMetrics, aggregateCompetitors } from '@/features/llm-analysis/metrics';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const errors: string[] = [];
  let processed = 0;

  try {
    // Fetch all brands with scheduling enabled
    const scheduledBrands = await db
      .select()
      .from(brands)
      .where(eq(brands.scheduleEnabled, true));

    for (const brand of scheduledBrands) {
      try {
        // Get active queries for this brand
        const activeQueries = await db
          .select()
          .from(queries)
          .where(and(eq(queries.brandId, brand.id), eq(queries.active, true)));

        if (activeQueries.length === 0) continue;

        const llmList = ['chatgpt'];
        const brandAliases = (brand.aliases as string[]) ?? [];

        // Create a run record
        const [run] = await db
          .insert(runs)
          .values({
            brandId: brand.id,
            llms: llmList,
            status: 'running',
            triggeredBy: 'cron',
            scheduledAt: new Date(),
          })
          .returning();

        const toInsert: typeof reports.$inferInsert[] = [];

        for (const query of activeQueries) {
          for (const llm of llmList) {
            try {
              const systemPrompt = `Sei un assistente che risponde a domande su prodotti e servizi. Rispondi in modo naturale e informativo.`;
              const response = await callLLM(llm as LLMProvider, systemPrompt, query.text);
              // Extract competitors via dedicated endpoint (inline minimal extraction)
              const competitorMatches: string[] = [];
              const isMentioned = detectMention(response, brand.name, brandAliases);
              const isFirst = isMentioned
                ? detectFirstPosition(response, brand.name, competitorMatches)
                : false;

              toInsert.push({
                brandId: brand.id,
                runId: run.id,
                llm,
                queryId: query.id,
                queryText: query.text,
                response,
                isMentioned,
                isFirst,
                competitors: competitorMatches,
              });
            } catch (err) {
              errors.push(`brand=${brand.id} query=${query.id} llm=${llm}: ${String(err)}`);
            }
          }
        }

        if (toInsert.length > 0) {
          const inserted = await db.insert(reports).values(toInsert).returning();

          // Mark run as completed
          await db
            .update(runs)
            .set({ status: 'completed', completedAt: new Date() })
            .where(eq(runs.id, run.id));

          // Save snapshot
          const metrics = calculateMetrics(inserted);
          const competitorsList = aggregateCompetitors(inserted);
          const topComp = competitorsList[0]?.name ?? null;
          const uniqueLLMs = [...new Set(inserted.map((r) => r.llm))];

          await db.insert(brandSnapshots).values({
            brandId: brand.id,
            runId: run.id,
            mentionRate: metrics.mentionRate,
            firstPositionRate: metrics.firstPositionRate,
            totalReports: inserted.length,
            competitorCount: competitorsList.length,
            topCompetitor: topComp,
            llms: uniqueLLMs,
          });
        } else {
          await db
            .update(runs)
            .set({ status: 'failed', completedAt: new Date() })
            .where(eq(runs.id, run.id));
        }

        processed++;
      } catch (err) {
        errors.push(`brand=${brand.id}: ${String(err)}`);
      }
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ processed, errors });
}
