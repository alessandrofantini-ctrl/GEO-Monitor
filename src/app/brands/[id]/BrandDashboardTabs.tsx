'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LLMBadge } from '@/components/ui/LLMBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CompetitorBar } from '@/components/ui/CompetitorBar';
import { formatDate, getCategoryColor, COLOR_CLASSES } from '@/lib/utils';
import type { Report, Run, Brand, BrandSnapshot } from '@/lib/db/schema';
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

interface CategoryOption {
  id: string;
  name: string;
  color: string;
}

interface Props {
  brand: Brand;
  brandId: string;
  reports: Report[];
  queries: QueryWithCategory[];
  runs: Run[];
  competitors: { name: string; count: number; percentage: number }[];
  categories?: CategoryOption[];
  snapshots?: BrandSnapshot[];
}

const TABS = ['Overview', 'Storico', 'Competitor', 'Query', 'Impostazioni'] as const;
type Tab = (typeof TABS)[number];

const COUNTRIES = ['Italy', 'United States', 'United Kingdom', 'Germany', 'France', 'Spain', 'Other'];
const LANGUAGES = ['Italiano', 'English', 'Deutsch', 'Français', 'Español'];

// ── Inline SVG Sparkline ──────────────────────────────────────────────────────
function Sparkline({ values, color = '#1D9E75' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const w = 80;
  const h = 24;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * w,
    y: h - ((v - min) / range) * (h - 4) - 2,
  }));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2" fill={color} />
      ))}
    </svg>
  );
}

export function BrandDashboardTabs({
  brand,
  brandId,
  reports,
  queries: initialQueries,
  runs,
  competitors,
  categories: initialCategories = [],
  snapshots = [],
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [queryToggles, setQueryToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(initialQueries.map((q) => [q.id, q.active ?? true]))
  );
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  // ---- Impostazioni: brand data form ----
  const [brandForm, setBrandForm] = useState({
    name: brand.name,
    url: brand.url,
    sector: brand.sector,
    country: brand.country ?? 'Italy',
    language: brand.language ?? 'Italiano',
  });
  const [aliases, setAliases] = useState<string[]>((brand.aliases as string[]) ?? []);
  const [newAlias, setNewAlias] = useState('');
  const [savingBrand, setSavingBrand] = useState(false);
  const [brandToast, setBrandToast] = useState('');

  // ---- Impostazioni: queries ----
  const [queries, setQueries] = useState<QueryWithCategory[]>(initialQueries);
  const [newQueryText, setNewQueryText] = useState('');
  const [newQueryCategoryId, setNewQueryCategoryId] = useState('');
  const [addingQuery, setAddingQuery] = useState(false);
  const [generatingQueries, setGeneratingQueries] = useState(false);

  // ---- Impostazioni: schedule ----
  const [scheduleEnabled, setScheduleEnabled] = useState(brand.scheduleEnabled ?? false);
  const [scheduleFrequency, setScheduleFrequency] = useState(brand.scheduleFrequency ?? 'weekly');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // ---- Impostazioni: danger zone ----
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const maxCompetitorCount = competitors[0]?.count ?? 1;

  // Sorted snapshots oldest → newest
  const sortedSnaps = [...snapshots].sort(
    (a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
  );
  const latestSnap = sortedSnaps[sortedSnaps.length - 1];
  const prevSnap = sortedSnaps.length >= 2 ? sortedSnaps[sortedSnaps.length - 2] : null;

  function snapDelta(field: 'mentionRate' | 'firstPositionRate' | 'competitorCount') {
    if (!latestSnap || !prevSnap) return null;
    return latestSnap[field] - prevSnap[field];
  }

  // Reports grouped by runId for Storico
  const reportsByRunId: Record<string, Report[]> = {};
  for (const r of reports) {
    if (!r.runId) continue;
    if (!reportsByRunId[r.runId]) reportsByRunId[r.runId] = [];
    reportsByRunId[r.runId].push(r);
  }

  // ── Actions ──────────────────────────────────────────────────────────

  async function handleExportPDF() {
    setExportLoading(true);
    try {
      let aiRecs = null;
      if (snapshots.length > 0) {
        const res = await fetch(`/api/brands/${brandId}/recommendations`);
        if (res.ok) aiRecs = await res.json();
      }
      await generateBrandPDF(brand, reports, initialQueries, competitors, snapshots, aiRecs);
    } finally {
      setExportLoading(false);
    }
  }

  async function toggleQuery(queryId: string) {
    const newVal = !queryToggles[queryId];
    setQueryToggles((prev) => ({ ...prev, [queryId]: newVal }));
    setQueries((prev) => prev.map((q) => (q.id === queryId ? { ...q, active: newVal } : q)));
    await fetch(`/api/brands/${brandId}/queries`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queryId, active: newVal }),
    });
  }

  async function deleteQuery(queryId: string) {
    await fetch(`/api/brands/${brandId}/queries?queryId=${queryId}`, { method: 'DELETE' });
    setQueries((prev) => prev.filter((q) => q.id !== queryId));
    setQueryToggles((prev) => { const n = { ...prev }; delete n[queryId]; return n; });
  }

  async function addQuery() {
    if (!newQueryText.trim()) return;
    setAddingQuery(true);
    const res = await fetch(`/api/brands/${brandId}/queries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newQueryText.trim(), categoryId: newQueryCategoryId || null, isManual: true }),
    });
    if (res.ok) {
      const created = await res.json();
      const cat = initialCategories.find((c) => c.id === created.categoryId);
      setQueries((prev) => [...prev, { ...created, categoryName: cat?.name ?? null, categoryColor: cat?.color ?? null }]);
      setQueryToggles((prev) => ({ ...prev, [created.id]: true }));
      setNewQueryText('');
      setNewQueryCategoryId('');
    }
    setAddingQuery(false);
  }

  async function generateQueriesWithAI() {
    setGeneratingQueries(true);
    try {
      const categoryNames = initialCategories.map((c) => c.name);
      const res = await fetch('/api/llm/generate-queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: brand.name,
          aliases: (brand.aliases as string[]) ?? [],
          categories: categoryNames.length > 0 ? categoryNames : [brand.sector],
          promptsPerCategory: 3,
          country: brand.country ?? 'Italy',
          language: brand.language ?? 'Italiano',
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const generated: { text: string; category: string }[] = data.queries ?? [];
      const existingTexts = new Set(queries.map((q) => q.text.toLowerCase()));

      for (const gq of generated) {
        if (existingTexts.has(gq.text.toLowerCase())) continue;
        const cat = initialCategories.find((c) => c.name === gq.category);
        const saveRes = await fetch(`/api/brands/${brandId}/queries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: gq.text, categoryId: cat?.id ?? null, isManual: true }),
        });
        if (saveRes.ok) {
          const created = await saveRes.json();
          setQueries((prev) => [...prev, { ...created, categoryName: cat?.name ?? null, categoryColor: cat?.color ?? null }]);
          setQueryToggles((prev) => ({ ...prev, [created.id]: true }));
          existingTexts.add(gq.text.toLowerCase());
        }
      }
    } finally {
      setGeneratingQueries(false);
    }
  }

  async function saveBrandData() {
    setSavingBrand(true);
    const res = await fetch(`/api/brands/${brandId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...brandForm, aliases }),
    });
    setSavingBrand(false);
    if (res.ok) {
      setBrandToast('Brand aggiornato');
      setTimeout(() => setBrandToast(''), 3000);
    }
  }

  async function saveSchedule(enabled: boolean, frequency: string) {
    setSavingSchedule(true);
    await fetch(`/api/brands/${brandId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduleEnabled: enabled, scheduleFrequency: frequency }),
    });
    setSavingSchedule(false);
  }

  async function deleteBrand() {
    setDeleting(true);
    const res = await fetch(`/api/brands/${brandId}`, { method: 'DELETE' });
    if (res.ok) { router.refresh(); router.push('/dashboard'); }
    else setDeleting(false);
  }

  // ─────────────────────────────────────────────────────────────────────
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
            onClick={handleExportPDF}
            disabled={exportLoading}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 disabled:opacity-50"
          >
            {exportLoading ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generando raccomandazioni AI...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Esporta PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="p-5">

        {/* ── Overview ── */}
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

        {/* ── Storico (redesigned) ── */}
        {activeTab === 'Storico' && (
          <div className="space-y-6">

            {/* KPI Trend cards */}
            {latestSnap && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Trend KPI</h4>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { label: 'Mention Rate', field: 'mentionRate' as const, suffix: '%', color: '#1D9E75' },
                    { label: 'First Position', field: 'firstPositionRate' as const, suffix: '%', color: '#7C3AED' },
                    { label: 'Competitor', field: 'competitorCount' as const, suffix: '', color: '#D85A30' },
                  ] as const).map(({ label, field, suffix, color }) => {
                    const delta = snapDelta(field);
                    const sparkValues = sortedSnaps.map((s) => s[field]);
                    return (
                      <div key={field} className="border border-[#e5e5e2] rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-1">{label}</p>
                        <p className="text-2xl font-bold text-gray-900">{latestSnap[field]}{suffix}</p>
                        {delta !== null && (
                          <p className={`text-xs mt-0.5 font-medium ${delta > 0 ? 'text-[#1D9E75]' : delta < 0 ? 'text-[#D85A30]' : 'text-gray-400'}`}>
                            {delta > 0 ? '+' : ''}{delta}{suffix} vs ultima analisi
                          </p>
                        )}
                        <div className="mt-3">
                          <Sparkline values={sparkValues} color={color} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Run cards */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Analisi effettuate</h4>
              {runs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Nessuna analisi eseguita.</p>
              ) : (
                <div className="space-y-3">
                  {[...runs].sort((a, b) =>
                    new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
                  ).map((run) => {
                    const runReports = reportsByRunId[run.id] ?? [];
                    const snap = snapshots.find((s) => s.runId === run.id);
                    const isExpanded = expandedRunId === run.id;
                    const llmList = (run.llms as string[]) ?? [];
                    const triggered = (run as Run & { triggeredBy?: string }).triggeredBy ?? 'manual';

                    return (
                      <div key={run.id} className="border border-[#e5e5e2] rounded-xl overflow-hidden">
                        {/* Card header */}
                        <div className="flex items-start gap-3 p-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-800">
                                {run.createdAt ? formatDate(run.createdAt) : '—'}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                triggered === 'cron'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {triggered === 'cron' ? 'Schedulato' : 'Manuale'}
                              </span>
                              {llmList.map((llm) => (
                                <LLMBadge key={llm} llm={llm} size="sm" />
                              ))}
                            </div>
                            {snap && (
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span>Mention rate: <strong className="text-gray-800">{snap.mentionRate}%</strong></span>
                                <span>{snap.totalReports} query analizzate</span>
                                {snap.topCompetitor && <span>Top competitor: <strong className="text-gray-800">{snap.topCompetitor}</strong></span>}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                            className="text-xs text-[#1D9E75] hover:underline flex-shrink-0"
                          >
                            {isExpanded ? 'Chiudi' : 'Vedi dettaglio'}
                          </button>
                        </div>

                        {/* Expanded report list */}
                        {isExpanded && runReports.length > 0 && (
                          <div className="border-t border-[#e5e5e2] bg-gray-50">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left text-gray-400 border-b border-gray-100">
                                  <th className="px-4 py-2 font-medium">LLM</th>
                                  <th className="px-4 py-2 font-medium">Query</th>
                                  <th className="px-4 py-2 font-medium">Stato</th>
                                </tr>
                              </thead>
                              <tbody>
                                {runReports.map((r) => (
                                  <tr key={r.id} className="border-b border-gray-100 last:border-0">
                                    <td className="px-4 py-2"><LLMBadge llm={r.llm} size="sm" /></td>
                                    <td className="px-4 py-2 max-w-xs">
                                      <span className="line-clamp-1 text-gray-700">{r.queryText}</span>
                                    </td>
                                    <td className="px-4 py-2">
                                      <StatusBadge isMentioned={r.isMentioned} isFirst={r.isFirst} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {isExpanded && runReports.length === 0 && (
                          <div className="border-t border-[#e5e5e2] bg-gray-50 px-4 py-3 text-xs text-gray-400">
                            Nessun report associato a questo run.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Competitor ── */}
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

        {/* ── Query ── */}
        {activeTab === 'Query' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400">{initialQueries.length} query totali</p>
            </div>
            {initialQueries.map((q) => {
              const catIndex = q.categoryName
                ? Array.from(new Set(initialQueries.map((x) => x.categoryName))).indexOf(q.categoryName)
                : 0;
              const color = getCategoryColor(catIndex >= 0 ? catIndex : 0);
              const cls = COLOR_CLASSES[color];

              return (
                <div key={q.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50">
                  {q.categoryName && (
                    <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border ${cls.bg} ${cls.text} ${cls.border}`}>
                      {q.categoryName}
                    </span>
                  )}
                  <span className={`flex-1 text-sm ${queryToggles[q.id] ? 'text-gray-700' : 'text-gray-300 line-through'}`}>
                    {q.text}
                  </span>
                  <button
                    onClick={() => toggleQuery(q.id)}
                    className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${queryToggles[q.id] ? 'bg-[#1D9E75]' : 'bg-gray-200'}`}
                    title={queryToggles[q.id] ? 'Disabilita' : 'Abilita'}
                  >
                    <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${queryToggles[q.id] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              );
            })}

            {/* ── Monitoraggio automatico ── */}
            <div className="mt-6 pt-5 border-t border-[#e5e5e2]">
              <h4 className="text-sm font-semibold text-gray-800 mb-1">Monitoraggio automatico</h4>
              <p className="text-xs text-gray-500 mb-4">
                Quando attivo, GEO Monitor eseguirà l'analisi automaticamente e salverà i risultati.
              </p>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    onClick={async () => {
                      const newVal = !scheduleEnabled;
                      setScheduleEnabled(newVal);
                      await saveSchedule(newVal, scheduleFrequency);
                    }}
                    className={`relative w-10 h-5 rounded-full transition-colors ${scheduleEnabled ? 'bg-[#1D9E75]' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${scheduleEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-sm text-gray-700">{scheduleEnabled ? 'Analisi automatica attiva' : 'Analisi automatica disattivata'}</span>
                  {savingSchedule && <span className="text-xs text-gray-400">Salvando...</span>}
                </label>

                {scheduleEnabled && (
                  <select
                    value={scheduleFrequency}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setScheduleFrequency(val);
                      await saveSchedule(scheduleEnabled, val);
                    }}
                    className="w-64 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75] bg-white"
                  >
                    <option value="weekly">Ogni settimana (lunedì)</option>
                    <option value="monthly">Ogni mese (1° del mese)</option>
                  </select>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Impostazioni ── */}
        {activeTab === 'Impostazioni' && (
          <div className="space-y-8">

            {brandToast && (
              <div className="bg-[#1D9E75]/10 border border-[#1D9E75]/30 text-[#1D9E75] text-sm px-4 py-2.5 rounded-lg">
                {brandToast}
              </div>
            )}

            {/* Dati brand */}
            <section>
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Dati brand</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                    <input
                      value={brandForm.name}
                      onChange={(e) => setBrandForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">URL</label>
                    <input
                      value={brandForm.url}
                      onChange={(e) => setBrandForm((f) => ({ ...f, url: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Settore</label>
                  <input
                    value={brandForm.sector}
                    onChange={(e) => setBrandForm((f) => ({ ...f, sector: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Paese</label>
                    <select
                      value={brandForm.country}
                      onChange={(e) => setBrandForm((f) => ({ ...f, country: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75] bg-white"
                    >
                      {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Lingua</label>
                    <select
                      value={brandForm.language}
                      onChange={(e) => setBrandForm((f) => ({ ...f, language: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75] bg-white"
                    >
                      {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                </div>

                {/* Alias */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Alias</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {aliases.map((alias) => (
                      <span key={alias} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full">
                        {alias}
                        <button onClick={() => setAliases((p) => p.filter((a) => a !== alias))} className="text-gray-400 hover:text-gray-600 ml-0.5">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={newAlias}
                      onChange={(e) => setNewAlias(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newAlias.trim()) {
                          e.preventDefault();
                          setAliases((p) => [...p, newAlias.trim()]);
                          setNewAlias('');
                        }
                      }}
                      placeholder="Aggiungi alias..."
                      className="flex-1 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1D9E75]"
                    />
                    {newAlias.trim() && (
                      <button
                        onClick={() => { setAliases((p) => [...p, newAlias.trim()]); setNewAlias(''); }}
                        className="px-3 py-2 bg-[#1D9E75] text-white rounded-lg text-sm hover:bg-[#178a65]"
                      >+</button>
                    )}
                  </div>
                </div>

                <button
                  onClick={saveBrandData}
                  disabled={savingBrand}
                  className="px-4 py-2 bg-[#1D9E75] text-white rounded-lg text-sm font-medium hover:bg-[#178a65] transition-colors disabled:opacity-50"
                >
                  {savingBrand ? 'Salvataggio...' : 'Salva modifiche'}
                </button>
              </div>
            </section>

            {/* Gestisci query */}
            <section>
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Gestisci query</h3>
              <div className="space-y-1.5 mb-4">
                {queries.map((q) => {
                  const catIndex = q.categoryName
                    ? Array.from(new Set(queries.map((x) => x.categoryName))).indexOf(q.categoryName)
                    : 0;
                  const color = getCategoryColor(catIndex >= 0 ? catIndex : 0);
                  const cls = COLOR_CLASSES[color];

                  return (
                    <div key={q.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 group">
                      {q.categoryName && (
                        <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border ${cls.bg} ${cls.text} ${cls.border}`}>
                          {q.categoryName}
                        </span>
                      )}
                      <span className={`flex-1 text-sm ${(q.active ?? true) ? 'text-gray-700' : 'text-gray-300 line-through'}`}>
                        {q.text}
                      </span>
                      <button
                        onClick={() => toggleQuery(q.id)}
                        className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${(q.active ?? true) ? 'bg-[#1D9E75]' : 'bg-gray-200'}`}
                        title={(q.active ?? true) ? 'Disabilita' : 'Abilita'}
                      >
                        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${(q.active ?? true) ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                      <button
                        onClick={() => deleteQuery(q.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-[#D85A30] rounded"
                        title="Elimina query"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 mb-3">
                <input
                  value={newQueryText}
                  onChange={(e) => setNewQueryText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addQuery()}
                  placeholder="Nuova query..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75]"
                />
                {initialCategories.length > 0 && (
                  <select
                    value={newQueryCategoryId}
                    onChange={(e) => setNewQueryCategoryId(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none bg-white"
                  >
                    <option value="">Categoria...</option>
                    {initialCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                <button
                  onClick={addQuery}
                  disabled={addingQuery || !newQueryText.trim()}
                  className="px-3 py-2 bg-[#1D9E75] text-white rounded-lg text-sm font-medium hover:bg-[#178a65] transition-colors disabled:opacity-50"
                >
                  {addingQuery ? '...' : 'Aggiungi query'}
                </button>
              </div>

              <button
                onClick={generateQueriesWithAI}
                disabled={generatingQueries}
                className="inline-flex items-center gap-2 px-3 py-2 border border-[#1D9E75] text-[#1D9E75] rounded-lg text-sm font-medium hover:bg-[#1D9E75]/5 transition-colors disabled:opacity-50"
              >
                {generatingQueries ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generazione in corso...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Aggiungi query con AI
                  </>
                )}
              </button>
            </section>

            {/* Zona pericolosa */}
            <section>
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Zona pericolosa</h3>
              <div className="border border-red-200 rounded-xl p-4 bg-red-50">
                <p className="text-sm text-red-700 mb-3">
                  Elimina questo brand e tutti i dati associati (analisi, report, query). Questa azione è irreversibile.
                </p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Elimina brand
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Conferma eliminazione</h3>
            <p className="text-sm text-gray-600 mb-4">
              Digita il nome del brand <strong>{brand.name}</strong> per confermare l'eliminazione.
            </p>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={brand.name}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={deleteBrand}
                disabled={deleteConfirmText !== brand.name || deleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? 'Eliminazione...' : 'Elimina definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
