import { NextRequest, NextResponse } from 'next/server';
import { callOpenAI } from '@/features/llm-analysis/providers/openai';
import { parseCompetitorsFromJSON } from '@/features/competitor-discovery/extract';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, brandName } = body as { text: string; brandName: string };

    if (!text || !brandName) {
      return NextResponse.json({ error: 'text and brandName are required' }, { status: 400 });
    }

    const system = `Sei un esperto di analisi competitiva. Estrai i nomi di brand/aziende/servizi concorrenti menzionati nel testo, ESCLUDENDO "${brandName}". Rispondi SOLO con JSON: {"competitors": ["NomeBrand1", "NomeBrand2"]}`;

    const raw = await callOpenAI(system, `Testo da analizzare:\n${text}`, {
      maxTokens: 500,
      jsonMode: true,
    });

    const competitors = parseCompetitorsFromJSON(raw);
    return NextResponse.json({ competitors });
  } catch (err) {
    console.error('[extract-competitors] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
