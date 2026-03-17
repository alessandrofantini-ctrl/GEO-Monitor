'use client';

import { useState } from 'react';
import { LLMBadge } from '@/components/ui/LLMBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CompetitorBar } from '@/components/ui/CompetitorBar';
import { formatDate, getCategoryColor, COLOR_CLASSES } from '@/lib/utils';
import type { Report, Run } from '@/lib/db/schema';
import { generateBrandPDF } from '@/features/pdf-export/generatePDF';

interface QueryWithCategory {
  id: string;
  text: string;
  active: boolean | null;
  isManual: boolean | null;
  categoryId: string | null;
  categoryName?: string | null;
  categoryColor?: string | null;
  createdAt: Date | null;
}

interface Props {
  brandId: string;
  reports: Report[];
  queries: QueryWithCategory[];
  runs: Run[];
  competitors: { name: string; count: number; percentage: number }[];
}

const TABS = ['Overview', 'Storico', 'Competitor', 'Query'] as const;
type Tab = (typeof TABS)[number];

export function BrandDashboardTabs({ brandId, reports, queries, runs, competitors }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [queryToggles, setQueryToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(queries.map((q) => [q.id, q.active ?? true]))
  );

  const maxCompetitorCount = competitors[0]?.count ?? 1;

  async function toggleQuery(queryId: string) {
    const newVal = !queryToggles[queryId];
    setQueryToggles((prev) => ({ ...prev, [queryId]: newVal }));
    await fetch(`/api/brands/${brandId}/queries`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queryId, active: newVal }),
    });
  }

  // Group reports by date for history tab
  const reportsByRun: Record<string, Report[]> = {};
  for (const r of reports) {
    const dateKey = r.runId ?? r.createdAt?.toISOString().slice(0, 10) ?? 'unknown';
    if (!reportsByRun[dateKey]) reportsByRun[dateKey] = [];
    reportsByRun[dateKey].push(r);
  }

  return (
    <div className="bg-white border border-[#e5e5e2] rounded-xl overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-[#e5e5e2]">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-[#1D9E75] text-[#1D9E75]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
        <div className="ml-auto flex items-center px-4">
          <button
            onClick={() => generateBrandPDF(reports, queries, competitors)}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Esporta PDF
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="p-5">
        {/* Overview */}
        {activeTab === 'Overview' && (
          <div>
            {reports.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm">Nessuna analisi ancora. Avvia la prima analisi.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-600 mb-3">Ultimi risultati ({reports.slice(0, 10).length})</h4>
                {reports.slice(0, 10).map((r) => (
                  <div key={r.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                    <LLMBadge llm={r.llm} size="sm" />
                    <span className="flex-1 text-sm text-gray-600 line-clamp-1">{r.queryText}</span>
                    <StatusBadge isMentioned={r.isMentioned} isFirst={r.isFirst} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Storico */}
        {activeTab === 'Storico' && (
          <div>
            {reports.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nessun report disponibile.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                      <th className="pb-2 font-medium pr-4">LLM</th>
                      <th className="pb-2 font-medium pr-4">Query</th>
                      <th className="pb-2 font-medium pr-4">Stato</th>
                      <th className="pb-2 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr key={r.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 pr-4"><LLMBadge llm={r.llm} size="sm" /></td>
                        <td className="py-2 pr-4 max-w-xs">
                          <span className="line-clamp-1 text-gray-700">{r.queryText}</span>
                        </td>
                        <td className="py-2 pr-4">
                          <StatusBadge isMentioned={r.isMentioned} isFirst={r.isFirst} />
                        </td>
                        <td className="py-2 text-gray-400 text-xs whitespace-nowrap">
                          {r.createdAt ? formatDate(r.createdAt) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Competitor */}
        {activeTab === 'Competitor' && (
          <div>
            {competitors.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nessun competitor rilevato ancora.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 mb-4">
                  Competitor menzionati nelle risposte degli LLM (aggregati su tutti i report)
                </p>
                {competitors.map((c) => (
                  <CompetitorBar
                    key={c.name}
                    name={c.name}
                    count={c.count}
                    percentage={c.percentage}
                    maxCount={maxCompetitorCount}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Query */}
        {activeTab === 'Query' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400">{queries.length} query totali</p>
            </div>
            {queries.map((q) => {
              const catIndex = q.categoryName
                ? Array.from(new Set(queries.map((x) => x.categoryName))).indexOf(q.categoryName)
                : 0;
              const color = getCategoryColor(catIndex >= 0 ? catIndex : 0);
              const cls = COLOR_CLASSES[color];

              return (
                <div
                  key={q.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50"
                >
                  {q.categoryName && (
                    <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border ${cls.bg} ${cls.text} ${cls.border}`}>
                      {q.categoryName}
                    </span>
                  )}
                  <span className={`flex-1 text-sm ${queryToggles[q.id] ? 'text-gray-700' : 'text-gray-300 line-through'}`}>
                    {q.text}
                  </span>
                  {/* Toggle */}
                  <button
                    onClick={() => toggleQuery(q.id)}
                    className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${
                      queryToggles[q.id] ? 'bg-[#1D9E75]' : 'bg-gray-200'
                    }`}
                    title={queryToggles[q.id] ? 'Disabilita' : 'Abilita'}
                  >
                    <span
                      className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
                        queryToggles[q.id] ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
