import { NextRequest, NextResponse } from 'next/server';
import { callOpenAI } from '@/features/llm-analysis/providers/openai';
import type { GenerateQueriesInput, GeneratedQuery } from '@/features/brands/types';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateQueriesInput;
    const { brand, aliases, categories, promptsPerCategory, country, language } = body;

    if (!brand || !categories?.length) {
      return NextResponse.json({ error: 'brand and categories are required' }, { status: 400 });
    }

    const system = `Sei un esperto SEO e GEO (Generative Engine Optimization).
Genera query di ricerca realistiche che un utente reale potrebbe usare per trovare servizi come quelli del brand analizzato.

REGOLE FONDAMENTALI:
1. Le query NON devono contenere il nome del brand (${brand}) né i suoi alias (${aliases.join(', ')})
2. Le query devono simulare ricerche reali di utenti che cercano servizi/prodotti nel settore
3. Le query devono essere localizzate per ${country} in lingua ${language}
4. Ogni query deve essere unica e coprire un aspetto diverso della categoria
5. Rispondi SOLO con JSON valido, senza markdown

Formato risposta:
{"queries": [{"text": "stringa query", "category": "nome categoria"}]}`;

    const categoriesList = categories
      .map((cat) => `- ${cat}: genera ${promptsPerCategory} query`)
      .join('\n');

    const user = `Brand: ${brand}
Paese: ${country}
Lingua: ${language}
Categorie e numero query richieste:
${categoriesList}

Genera le query richieste per ogni categoria. Le query devono essere realistiche e non menzionare il brand.`;

    const raw = await callOpenAI(system, user, {
      maxTokens: 2000,
      jsonMode: true,
    });

    const result = JSON.parse(raw) as { queries: GeneratedQuery[] };

    return NextResponse.json({ queries: result.queries || [] });
  } catch (err) {
    console.error('[generate-queries] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
