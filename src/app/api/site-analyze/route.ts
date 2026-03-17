import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { callOpenAI } from '@/features/llm-analysis/providers/openai';

// WHY: timeout aggressivo per non bloccare il server su siti lenti
const FETCH_TIMEOUT_MS = 8000;
// WHY: limitiamo le sottopagine da seguire per contenere i token passati a GPT-4o
const MAX_SUBPAGES = 5;
// WHY: soglia di caratteri per evitare di passare contenuto enorme a GPT-4o
const MAX_CONTENT_CHARS = 12000;

async function fetchPageText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // WHY: alcuni siti bloccano richieste senza User-Agent
        'User-Agent': 'Mozilla/5.0 (compatible; GEOMonitor/1.0; +https://geo-monitor.vercel.app)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    return extractText(html);
  } finally {
    clearTimeout(timer);
  }
}

function extractText(html: string): string {
  const $ = cheerio.load(html);

  // Rimuove elementi non testuali
  $('script, style, noscript, svg, img, iframe, head, nav, footer').remove();

  // WHY: prendiamo il testo del body pulito — cheerio rimuove i tag mantenendo il testo
  return $('body').text().replace(/\s+/g, ' ').trim();
}

function extractNavLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  const links = new Set<string>();

  // WHY: cerchiamo i link nei tag nav e header — quelli del menu principale
  // hanno maggiore probabilità di portare alle pagine di servizi rilevanti
  $('nav a, header a, [role="navigation"] a').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    try {
      const absolute = new URL(href, base).toString();
      // Tieni solo link interni allo stesso dominio, esclude ancore e risorse
      if (
        absolute.startsWith(base.origin) &&
        !absolute.includes('#') &&
        !absolute.match(/\.(pdf|jpg|png|gif|svg|css|js|xml|json)$/i) &&
        absolute !== baseUrl
      ) {
        links.add(absolute);
      }
    } catch {
      // URL non valido, ignora
    }
  });

  return Array.from(links).slice(0, MAX_SUBPAGES);
}

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

    // ── Step 1: fetch homepage ──────────────────────────────────────────
    let homepageHtml = '';
    let homepageText = '';

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GEOMonitor/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });
      clearTimeout(timer);
      homepageHtml = await res.text();
      homepageText = extractText(homepageHtml);
      console.log('\n════════════════════════════════════════');
      console.log(`[site-analyze] HOMEPAGE TEXT (${homepageText.length} chars) — ${url}`);
      console.log('════════════════════════════════════════');
      console.log(homepageText.slice(0, 3000));
      if (homepageText.length > 3000) console.log(`... [+${homepageText.length - 3000} chars troncati]`);
      console.log('════════════════════════════════════════\n');
    } catch (err) {
      console.warn('[site-analyze] homepage fetch failed:', err);
      // WHY: se il fetch fallisce (sito down, timeout, CORS) non blocchiamo —
      // passiamo a GPT-4o solo l'URL e quel che sa già
    }

    // ── Step 2: segui link di navigazione principali ────────────────────
    const subpageTexts: string[] = [];

    if (homepageHtml) {
      const navLinks = extractNavLinks(homepageHtml, url);
      console.log(`[site-analyze] NAV LINKS trovati (${navLinks.length}):`, navLinks);

      await Promise.allSettled(
        navLinks.map(async (link) => {
          try {
            const text = await fetchPageText(link);
            if (text.length > 100) {
              console.log(`\n[site-analyze] SUBPAGE TEXT (${text.length} chars) — ${link}`);
              console.log('────────────────────────────────────────');
              console.log(text.slice(0, 1000));
              if (text.length > 1000) console.log(`... [+${text.length - 1000} chars troncati]`);
              subpageTexts.push(`--- Pagina: ${link} ---\n${text.slice(0, 2000)}`);
            }
          } catch (err) {
            console.warn(`[site-analyze] subpage fetch failed: ${link}`, err);
          }
        })
      );
    }

    // ── Step 3: assembla il contesto da passare a GPT-4o ────────────────
    const allContent = [
      homepageText ? `--- Homepage: ${url} ---\n${homepageText}` : '',
      ...subpageTexts,
    ]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, MAX_CONTENT_CHARS);

    // WHY: se non siamo riusciti a fare scraping, GPT-4o lavora sull'URL —
    // meglio di niente ma meno preciso
    const hasRealContent = allContent.length > 200;
    console.log(`\n[site-analyze] CONTESTO FINALE GPT-4o (${allContent.length} chars, hasRealContent=${hasRealContent})`);
    console.log('════════════════════════════════════════');
    console.log(allContent.slice(0, 2000));
    if (allContent.length > 2000) console.log(`... [+${allContent.length - 2000} chars troncati]`);
    console.log('════════════════════════════════════════\n');

    const system = `Sei un esperto di brand analysis. Analizza il contenuto del sito web fornito e restituisci SOLO un JSON valido con le seguenti chiavi:
- name: string (nome brand principale, come appare nel sito)
- description: string (descrizione accurata 2-3 frasi basata sul contenuto reale)
- aliases: string[] (nomi alternativi trovati nel sito: ragione sociale, varianti, dominio senza TLD)
- country: string (paese principale del brand, basato sul contenuto)
- language: string (lingua principale del sito)
- categories: string[] (5-8 categorie di business rilevanti in italiano, basate sui servizi/prodotti reali trovati nel sito, es. "Agenzia Marketing Digitale")

IMPORTANTE: basa la risposta ESCLUSIVAMENTE sul contenuto del sito fornito, non su conoscenze pregresse.
Rispondi SOLO con il JSON, senza markdown o testo aggiuntivo.`;

    const user = hasRealContent
      ? `URL: ${url}
Paese target: ${country}
Lingua target: ${language}

Contenuto estratto dal sito (homepage + pagine di navigazione principali):

${allContent}`
      : `URL: ${url}
Paese target: ${country}
Lingua target: ${language}

NOTA: Non è stato possibile recuperare il contenuto del sito. Analizza l'URL e restituisci una stima basata sul dominio.`;

    const raw = await callOpenAI(system, user, { maxTokens: 1200, jsonMode: true });
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
