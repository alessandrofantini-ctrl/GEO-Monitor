import { NextRequest, NextResponse } from 'next/server';
import { callOpenAI } from '@/features/llm-analysis/providers/openai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, country = 'Italy', language = 'Italiano' } = body as {
      url: string;
      country?: string;
      language?: string;
    };

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    const system = `Sei un esperto di brand analysis. Analizza il sito web fornito e restituisci SOLO un JSON valido con le seguenti chiavi:
- name: string (nome brand principale)
- description: string (descrizione 2-3 frasi)
- aliases: string[] (nomi alternativi: ragione sociale, varianti, dominio senza TLD)
- country: string (paese principale del brand)
- language: string (lingua principale del brand)
- categories: string[] (5-8 categorie di business rilevanti in italiano, es. "Agenzia Marketing Digitale")

Rispondi SOLO con il JSON, senza markdown o testo aggiuntivo.`;

    const user = `Analizza il brand con sito web: ${url}
Paese target: ${country}
Lingua target: ${language}

Genera le categorie in italiano e rilevanti per il settore del brand.`;

    const raw = await callOpenAI(system, user, { maxTokens: 1000, jsonMode: true });

    const result = JSON.parse(raw);

    // WHY: validazione minimale per garantire la struttura attesa dal frontend
    if (!result.name || !result.categories) {
      throw new Error('Invalid response structure from OpenAI');
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[site-analyze] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
