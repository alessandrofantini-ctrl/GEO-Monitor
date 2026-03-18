import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db, reports, runs, brandSnapshots } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { detectMention, detectFirstPosition, calculateMetrics, aggregateCompetitors } from '@/features/llm-analysis/metrics';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await db
      .select()
      .from(reports)
      .where(eq(reports.brandId, id))
      .orderBy(desc(reports.createdAt));
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: brandId } = await params;
    const body = await req.json();
    const { llms, items, brandName, brandAliases = [] } = body as {
      llms: string[];
      brandName: string;
      brandAliases: string[];
      items: {
        queryId: string;
        queryText: string;
        llm: string;
        response: string;
        competitors: string[];
        runId?: string;
      }[];
    };

    if (!items?.length) {
      return NextResponse.json({ error: 'items array is required' }, { status: 400 });
    }

    // Create a run record
    console.log('[reports POST] inserting run for brandId:', brandId, 'llms:', llms);
    const [run] = await db
      .insert(runs)
      .values({ brandId, llms: llms ?? [], status: 'completed', completedAt: new Date() })
      .returning();
    console.log('[reports POST] run inserted:', run.id);

    const toInsert = items.map((item) => {
      const isMentioned = detectMention(item.response, brandName, brandAliases);
      const isFirst = isMentioned
        ? detectFirstPosition(item.response, brandName, item.competitors)
        : false;

      return {
        brandId,
        runId: run.id,
        llm: item.llm,
        queryId: item.queryId,
        queryText: item.queryText,
        response: item.response,
        isMentioned,
        isFirst,
        competitors: item.competitors ?? [],
      };
    });

    console.log('[reports POST] inserting', toInsert.length, 'reports for runId:', run.id);
    const inserted = await db.insert(reports).values(toInsert).returning();
    console.log('[reports POST] reports inserted:', inserted.length);

    // WHY: ogni run produce uno snapshot KPI
    // così il tab Storico mostra il trend nel tempo senza ricalcolare
    const metrics = calculateMetrics(inserted);
    const competitorsList = aggregateCompetitors(inserted);
    const topComp = competitorsList[0]?.name ?? null;
    const uniqueLLMs = [...new Set(inserted.map((r) => r.llm))];

    try {
      await db.insert(brandSnapshots).values({
        brandId,
        runId: run.id,
        mentionRate: metrics.mentionRate,
        firstPositionRate: metrics.firstPositionRate,
        totalReports: inserted.length,
        competitorCount: competitorsList.length,
        topCompetitor: topComp,
        llms: uniqueLLMs,
      });
    } catch (snapshotErr) {
      console.error('[reports POST] snapshot insert failed (migration pending?):', snapshotErr);
    }

    revalidatePath(`/brands/${brandId}`);

    return NextResponse.json({ run, reports: inserted }, { status: 201 });
  } catch (err) {
    console.error('[reports POST] error:', err);
    return NextResponse.json({ error: 'Failed to save reports' }, { status: 500 });
  }
}
