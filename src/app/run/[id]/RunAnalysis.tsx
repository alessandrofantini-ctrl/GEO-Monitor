'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { LLMBadge } from '@/components/ui/LLMBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getCategoryColor, COLOR_CLASSES } from '@/lib/utils';
import type { Brand } from '@/lib/db/schema';

interface QueryItem {
  id: string;
  text: string;
  active: boolean | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
}

interface ResultItem {
  queryId: string;
  queryText: string;
  llm: string;
  response: string;
  isMentioned: boolean;
  isFirst: boolean;
  competitors: string[];
}

const AVAILABLE_LLMS = [
  { id: 'chatgpt', label: 'ChatGPT 4o' },
  { id: 'claude', label: 'Claude' },
];

interface Props {
  brand: Brand;
  initialQueries: QueryItem[];
}

export function RunAnalysis({ brand, initialQueries }: Props) {
  const router = useRouter();
  const [selectedLLMs, setSelectedLLMs] = useState<string[]>(['chatgpt']);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentQueryText, setCurrentQueryText] = useState('');
  const [currentLLM, setCurrentLLM] = useState('');
  const [results, setResults] = useState<ResultItem[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const totalSteps = initialQueries.length * selectedLLMs.length;

  function toggleLLM(id: string) {
    setSelectedLLMs((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  }

  async function runAnalysis() {
    setRunning(true);
    setResults([]);
    setProgress(0);
    abortRef.current = new AbortController();

    let step = 0;
    const collected: ResultItem[] = [];

    for (const llm of selectedLLMs) {
      for (const query of initialQueries) {
        setCurrentQueryText(query.text);
        setCurrentLLM(llm);

        try {
          // Run the query
          const runRes = await fetch('/api/llm/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              queryText: query.text,
              llm,
              brandName: brand.name,
              brandSector: brand.sector,
            }),
            signal: abortRef.current.signal,
          });

          if (!runRes.ok) throw new Error(`LLM run failed for ${llm}`);
          const { text } = await runRes.json();

          // Extract competitors
          const compRes = await fetch('/api/llm/extract-competitors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, brandName: brand.name }),
            signal: abortRef.current.signal,
          });

          const compData = compRes.ok ? await compRes.json() : { competitors: [] };

          const result: ResultItem = {
            queryId: query.id,
            queryText: query.text,
            llm,
            response: text,
            isMentioned: false, // computed server-side when saving
            isFirst: false,
            competitors: compData.competitors ?? [],
          };
          collected.push(result);
          setResults([...collected]);
        } catch (err: unknown) {
          if (err instanceof Error && err.name === 'AbortError') break;
          // On error for a single query, continue with others
          collected.push({
            queryId: query.id,
            queryText: query.text,
            llm,
            response: '',
            isMentioned: false,
            isFirst: false,
            competitors: [],
          });
        }

        step++;
        setProgress(Math.round((step / totalSteps) * 100));
      }
    }

    // Save results to DB
    try {
      const saveRes = await fetch(`/api/brands/${brand.id}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          llms: selectedLLMs,
          brandName: brand.name,
          brandAliases: brand.aliases ?? [],
          items: collected.filter((r) => r.response),
        }),
      });
      if (!saveRes.ok) {
        const errBody = await saveRes.text();
        console.error('[RunAnalysis] save failed', saveRes.status, errBody);
      }
    } catch (err) {
      console.error('[RunAnalysis] save error:', err);
    }

    setRunning(false);
    setDone(true);
    setCurrentQueryText('');
    setCurrentLLM('');
    setProgress(100);

    // Redirect after short delay with visual feedback
    // router.refresh() invalidates the client-side router cache so the
    // brand page re-fetches fresh data instead of serving the cached version
    setTimeout(() => {
      router.refresh();
      router.push(`/brands/${brand.id}`);
    }, 2500);
  }

  const categoryNames = Array.from(new Set(initialQueries.map((q) => q.categoryName)));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Analisi visibilità</h1>
        <p className="text-sm text-gray-500 mt-1">
          {brand.name} · {initialQueries.length} query attive
        </p>
      </div>

      {/* Config card */}
      {!running && !done && (
        <div className="bg-white border border-[#e5e5e2] rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">LLM da usare</h3>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_LLMS.map((llm) => (
                <label
                  key={llm.id}
                  className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg cursor-pointer text-sm transition-colors ${
                    selectedLLMs.includes(llm.id)
                      ? 'border-[#1D9E75] bg-[#1D9E75]/5 text-[#1D9E75]'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selectedLLMs.includes(llm.id)}
                    onChange={() => toggleLLM(llm.id)}
                  />
                  {llm.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Query ({initialQueries.length})</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {initialQueries.slice(0, 10).map((q) => {
                const catIndex = categoryNames.indexOf(q.categoryName);
                const color = getCategoryColor(catIndex >= 0 ? catIndex : 0);
                const cls = COLOR_CLASSES[color];
                return (
                  <div key={q.id} className="flex items-center gap-2 text-sm text-gray-600">
                    {q.categoryName && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${cls.bg} ${cls.text}`}>
                        {q.categoryName}
                      </span>
                    )}
                    <span className="line-clamp-1">{q.text}</span>
                  </div>
                );
              })}
              {initialQueries.length > 10 && (
                <p className="text-xs text-gray-400 pl-1">...e altre {initialQueries.length - 10}</p>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Totale: {totalSteps} chiamate LLM ({initialQueries.length} query × {selectedLLMs.length} LLM)
          </p>

          <button
            onClick={runAnalysis}
            disabled={selectedLLMs.length === 0 || initialQueries.length === 0}
            className="w-full py-2.5 bg-[#1D9E75] text-white rounded-lg text-sm font-medium hover:bg-[#178a65] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Avvia analisi
          </button>
        </div>
      )}

      {/* Progress */}
      {running && (
        <div className="bg-white border border-[#e5e5e2] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Analisi in corso...</h3>
            <span className="text-xs text-gray-400">{results.length}/{totalSteps}</span>
          </div>
          <ProgressBar value={progress} />
          {currentQueryText && (
            <div className="text-xs text-gray-500">
              <span className="font-medium">Query: </span>
              <span className="italic">{currentQueryText}</span>
              {currentLLM && <LLMBadge llm={currentLLM} size="sm" />}
            </div>
          )}
        </div>
      )}

      {/* Done banner */}
      {done && (
        <div className="bg-[#1D9E75]/10 border border-[#1D9E75]/20 rounded-xl p-4 text-center">
          <p className="text-sm font-medium text-[#1D9E75]">
            Analisi completata! Redirect alla dashboard...
          </p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white border border-[#e5e5e2] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">
              Risultati in tempo reale ({results.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {results.map((r, i) => (
              <div key={i} className="px-5 py-3 flex items-start gap-3">
                <LLMBadge llm={r.llm} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1 line-clamp-1">{r.queryText}</p>
                  <p className="text-sm text-gray-700 line-clamp-2">{r.response}</p>
                  {r.competitors.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      Competitor: {r.competitors.slice(0, 3).join(', ')}
                      {r.competitors.length > 3 && ` +${r.competitors.length - 3}`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
