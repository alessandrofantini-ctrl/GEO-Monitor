'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCategoryColor, COLOR_CLASSES } from '@/lib/utils';
import type { OnboardingState } from './OnboardingWizard';
import type { GeneratedQuery } from '@/features/brands/types';

interface Props {
  state: OnboardingState;
  onUpdate: (partial: Partial<OnboardingState>) => void;
  onSave: (brandId: string) => void;
}

export function Step4ReviewPrompts({ state, onUpdate, onSave }: Props) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [newManualQuery, setNewManualQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [duplicate, setDuplicate] = useState<{ id: string; name: string } | null>(null);

  const { queries, selectedCategories, analysis, aliases, platforms } = state;

  // Get unique categories in the queries
  const categories = Array.from(new Set(queries.map((q) => q.category)));
  const filteredQueries = activeCategory
    ? queries.filter((q) => q.category === activeCategory)
    : queries;

  function deleteQuery(index: number) {
    const globalIndex = queries.indexOf(filteredQueries[index]);
    onUpdate({ queries: queries.filter((_, i) => i !== globalIndex) });
  }

  function startEdit(index: number) {
    setEditingIndex(index);
    setEditText(filteredQueries[index].text);
  }

  function saveEdit(index: number) {
    const globalIndex = queries.indexOf(filteredQueries[index]);
    const updated = [...queries];
    updated[globalIndex] = { ...updated[globalIndex], text: editText };
    onUpdate({ queries: updated });
    setEditingIndex(null);
  }

  function addManualQuery() {
    if (!newManualQuery.trim()) return;
    const newQ: GeneratedQuery = {
      text: newManualQuery.trim(),
      category: selectedCategories[0] ?? 'Manuale',
    };
    onUpdate({ queries: [...queries, newQ] });
    setNewManualQuery('');
  }

  async function saveBrand(force = false) {
    setSaving(true);
    setError('');

    try {
      // 1. Create the brand
      const brandRes = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: analysis!.name,
          url: state.url,
          sector: selectedCategories[0] ?? 'Generale',
          description: analysis!.description,
          aliases,
          country: state.country,
          language: state.language,
          force,
        }),
      });

      if (brandRes.status === 409) {
        const data = await brandRes.json();
        setDuplicate({ id: data.existingBrandId, name: data.existingBrandName });
        setSaving(false);
        return;
      }

      if (!brandRes.ok) throw new Error('Errore nel salvataggio del brand');
      const brand = await brandRes.json();

      // 2. Save queries with categories
      const uniqueCategories = Array.from(new Set(queries.map((q) => q.category)));
      const categoryColors = Object.fromEntries(
        uniqueCategories.map((cat, i) => [cat, getCategoryColor(i)])
      );

      const queriesRes = await fetch(`/api/brands/${brand.id}/queries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: uniqueCategories.map((name) => ({
            name,
            color: categoryColors[name],
          })),
          queries: queries.map((q) => ({
            text: q.text,
            category: q.category,
          })),
        }),
      });

      if (!queriesRes.ok) throw new Error('Errore nel salvataggio delle query');

      onSave(brand.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
      setSaving(false);
    }
  }

  async function handleSave() {
    await saveBrand(false);
  }

  async function handleForceSave() {
    setDuplicate(null);
    await saveBrand(true);
  }

  return (
    <div className="space-y-4">
      {/* Brand summary */}
      <div className="bg-white border border-[#e5e5e2] rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">{analysis?.name}</h3>
            <p className="text-xs text-gray-400">{state.url}</p>
          </div>
        </div>
      </div>

      {/* Prompts review */}
      <div className="bg-white border border-[#e5e5e2] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 text-sm">Review Generated Prompts</h3>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newManualQuery}
              onChange={(e) => setNewManualQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addManualQuery())}
              placeholder="Aggiungi prompt manuale..."
              className="text-xs px-3 py-1.5 border border-dashed border-gray-300 rounded-lg focus:outline-none focus:border-[#1D9E75] w-48"
            />
            {newManualQuery && (
              <button
                onClick={addManualQuery}
                className="text-xs text-white bg-[#1D9E75] px-2 py-1.5 rounded-lg hover:bg-[#178a65]"
              >
                +
              </button>
            )}
          </div>
        </div>

        {/* Category filter pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveCategory(null)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              activeCategory === null
                ? 'bg-gray-900 text-white border-gray-900'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            Tutte le categorie ({queries.length})
          </button>
          {categories.map((cat, i) => {
            const color = getCategoryColor(i);
            const cls = COLOR_CLASSES[color];
            const count = queries.filter((q) => q.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  activeCategory === cat
                    ? `${cls.bg} ${cls.text} ${cls.border}`
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Query list */}
        <div className="space-y-1.5">
          {filteredQueries.map((query, i) => {
            const catIndex = categories.indexOf(query.category);
            const color = getCategoryColor(catIndex >= 0 ? catIndex : 0);
            const cls = COLOR_CLASSES[color];

            return (
              <div
                key={i}
                className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 group"
              >
                <span
                  className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border ${cls.bg} ${cls.text} ${cls.border} mt-0.5`}
                >
                  {query.category}
                </span>

                {editingIndex === i ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(i);
                        if (e.key === 'Escape') setEditingIndex(null);
                      }}
                      className="flex-1 text-sm px-2 py-1 border border-[#1D9E75] rounded focus:outline-none"
                    />
                    <button onClick={() => saveEdit(i)} className="text-xs text-[#1D9E75] hover:underline">Salva</button>
                    <button onClick={() => setEditingIndex(null)} className="text-xs text-gray-400 hover:underline">Annulla</button>
                  </div>
                ) : (
                  <span className="flex-1 text-sm text-gray-700">{query.text}</span>
                )}

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0">
                  <button
                    onClick={() => startEdit(i)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    title="Modifica"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteQuery(i)}
                    className="p-1 text-gray-400 hover:text-[#D85A30] rounded"
                    title="Elimina"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {duplicate && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <p className="text-sm font-medium text-amber-800 mb-2">
            <strong>{duplicate.name}</strong> è già monitorato con questo dominio.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/brands/${duplicate.id}`)}
              className="text-sm px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              Vai al brand esistente
            </button>
            <button
              onClick={handleForceSave}
              disabled={saving}
              className="text-sm px-3 py-1.5 border border-amber-400 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              Crea comunque
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm text-[#D85A30] bg-[#D85A30]/5 border border-[#D85A30]/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-sm text-gray-500">{queries.length} prompt totali</span>
        <button
          onClick={handleSave}
          disabled={saving || queries.length === 0}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1D9E75] text-white rounded-lg text-sm font-medium hover:bg-[#178a65] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Salvataggio...
            </>
          ) : (
            'Analyze Visibility →'
          )}
        </button>
      </div>
    </div>
  );
}
