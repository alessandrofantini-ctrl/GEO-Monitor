// WHY: genera raccomandazioni actionable basate sui dati reali del brand
// chiamata lazy solo quando l'utente clicca "Genera report PDF"
import { NextRequest, NextResponse } from 'next/server';
import { db, brands, brandSnapshots, reports } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { aggregateCompetitors } from '@/features/llm-analysis/metrics';
import { callOpenAI } from '@/features/llm-analysis/providers/openai';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [brand] = await db.select().from(brands).where(eq(brands.id, id));
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

    // Get last 2 snapshots ordered by creation
    const snapshots = await db
      .select()
      .from(brandSnapshots)
      .where(eq(brandSnapshots.brandId, id))
      .orderBy(desc(brandSnapshots.createdAt))
      .limit(2);

    if (snapshots.length === 0) {
      return NextResponse.json({
        summary: 'Nessun dato disponibile. Esegui almeno un\'analisi prima di generare raccomandazioni.',
        recommendations: [],
      });
    }

    const latestSnapshot = snapshots[0];
    const previousSnapshot = snapshots[1] ?? null;
    const delta = previousSnapshot
      ? latestSnapshot.mentionRate - previousSnapshot.mentionRate
      : 0;

    // Top 5 competitors from all reports
    const allReports = await db
      .select()
      .from(reports)
      .where(eq(reports.brandId, id))
      .orderBy(desc(reports.createdAt))
      .limit(200);

    const topCompetitors = aggregateCompetitors(allReports)
      .slice(0, 5)
      .map((c) => c.name);

    // Queries where brand is never mentioned (last 50 reports)
    const recentReports = allReports.slice(0, 50);
    const missedQueryIds = new Set(
      recentReports.filter((r) => !r.isMentioned).map((r) => r.queryId)
    );
    const mentionedQueryIds = new Set(
      recentReports.filter((r) => r.isMentioned).map((r) => r.queryId)
    );
    const purelyMissedIds = [...missedQueryIds].filter((id) => !mentionedQueryIds.has(id));
    const missedQueryTexts = recentReports
      .filter((r) => purelyMissedIds.includes(r.queryId))
      .map((r) => r.queryText)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 5);

    const prompt = `Sei un esperto di GEO (Generative Engine Optimization).
Analizza questi dati di visibilità LLM e fornisci 4 raccomandazioni concrete e actionable per migliorare il posizionamento.

Brand: ${brand.name}
Settore: ${brand.sector}
Mention Rate attuale: ${latestSnapshot.mentionRate}%
Trend: ${delta > 0 ? '+' : ''}${delta}% rispetto all'analisi precedente
Top competitor che vengono citati al posto del brand: ${topCompetitors.join(', ') || 'nessuno rilevato'}
Query dove il brand non appare mai: ${missedQueryTexts.join(' | ') || 'nessuna'}

Rispondi con un JSON valido (senza markdown):
{
  "summary": "frase di sintesi in italiano (1-2 frasi)",
  "recommendations": [
    { "title": "titolo breve", "description": "descrizione actionable 1-2 frasi" }
  ]
}`;

    const raw = await callOpenAI('Sei un esperto di GEO e SEO.', prompt, {
      maxTokens: 800,
      jsonMode: true,
    });

    const result = JSON.parse(raw) as {
      summary: string;
      recommendations: { title: string; description: string }[];
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('[recommendations GET] error:', err);
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }
}
