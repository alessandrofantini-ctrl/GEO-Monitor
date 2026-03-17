import { NextRequest, NextResponse } from 'next/server';
import { callLLM, type LLMProvider } from '@/features/llm-analysis/providers/router';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { queryText, llm, brandName, brandSector } = body as {
      queryText: string;
      llm: LLMProvider;
      brandName: string;
      brandSector: string;
    };

    if (!queryText || !llm || !brandName) {
      return NextResponse.json(
        { error: 'queryText, llm, brandName are required' },
        { status: 400 }
      );
    }

    const system = `Sei un assistente AI che risponde a domande su servizi e prodotti.
Rispondi come faresti normalmente a una domanda di un utente che cerca servizi nel settore "${brandSector}".
Sii naturale, informativo e menziona brand/aziende reali se pertinenti.
Rispondi in italiano.`;

    const text = await callLLM(llm, system, queryText);

    return NextResponse.json({ text });
  } catch (err) {
    console.error('[llm/run] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
