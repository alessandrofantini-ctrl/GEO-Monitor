'use client';

import { useState } from 'react';
import { getCategoryColor, COLOR_CLASSES } from '@/lib/utils';
import type { OnboardingState } from './OnboardingWizard';

const PROMPTS_OPTIONS = [1, 2, 3, 5];

interface Props {
  state: OnboardingState;
  onUpdate: (partial: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step2ReviewCategories({ state, onUpdate, onNext, onBack }: Props) {
  const { analysis, selectedCategories, promptsPerCategory, aliases } = state;
  const [newAlias, setNewAlias] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [allCategories, setAllCategories] = useState<string[]>(analysis?.categories ?? []);
  const [showReadMore, setShowReadMore] = useState(false);

  if (!analysis) return null;

  const totalPrompts = selectedCategories.length * promptsPerCategory;

  function toggleCategory(cat: string) {
    if (selectedCategories.includes(cat)) {
      onUpdate({ selectedCategories: selectedCategories.filter((c) => c !== cat) });
    } else if (selectedCategories.length < 3) {
      onUpdate({ selectedCategories: [...selectedCategories, cat] });
    }
  }

  function addAlias() {
    if (newAlias.trim() && !aliases.includes(newAlias.trim())) {
      onUpdate({ aliases: [...aliases, newAlias.trim()] });
      setNewAlias('');
    }
  }

  function removeAlias(alias: string) {
    onUpdate({ aliases: aliases.filter((a) => a !== alias) });
  }

  function addCustomCategory() {
    if (customCategory.trim() && !allCategories.includes(customCategory.trim())) {
      const newCat = customCategory.trim();
      setAllCategories([...allCategories, newCat]);
      if (selectedCategories.length < 3) {
        onUpdate({ selectedCategories: [...selectedCategories, newCat] });
      }
      setCustomCategory('');
    }
  }

  return (
    <div className="space-y-4">
      {/* Brand Card */}
      <div className="bg-white border border-[#e5e5e2] rounded-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-semibold text-gray-900 text-lg">{analysis.name}</h2>
              <a
                href={state.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#1D9E75] hover:underline flex items-center gap-0.5"
              >
                Visit Website
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              {analysis.country} · {analysis.language}
            </p>
            <p className={`text-sm text-gray-600 ${!showReadMore ? 'line-clamp-2' : ''}`}>
              {analysis.description}
            </p>
            {analysis.description && analysis.description.length > 120 && (
              <button
                className="text-xs text-[#1D9E75] mt-1 hover:underline"
                onClick={() => setShowReadMore(!showReadMore)}
              >
                {showReadMore ? 'Mostra meno' : 'Leggi tutto'}
              </button>
            )}
          </div>
        </div>

        {/* Aliases */}
        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Alias / Nomi alternativi</p>
          <div className="flex flex-wrap gap-2">
            {aliases.map((alias) => (
              <span
                key={alias}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                {alias}
                <button onClick={() => removeAlias(alias)} className="hover:text-red-500 ml-1">×</button>
              </span>
            ))}
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAlias())}
                placeholder="+ Aggiungi alias"
                className="text-xs px-2 py-1 border border-dashed border-gray-300 rounded-full focus:outline-none focus:border-[#1D9E75] w-32"
              />
              {newAlias && (
                <button
                  onClick={addAlias}
                  className="text-xs text-[#1D9E75] hover:underline"
                >
                  Aggiungi
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white border border-[#e5e5e2] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Seleziona Business Categories</h3>
            <p className="text-xs text-gray-400 mt-0.5">{selectedCategories.length}/3 selezionate</p>
          </div>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {allCategories.map((cat, i) => {
            const color = getCategoryColor(i);
            const colorClass = COLOR_CLASSES[color];
            const isSelected = selectedCategories.includes(cat);
            const isDisabled = !isSelected && selectedCategories.length >= 3;

            return (
              <label
                key={cat}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? `${colorClass.bg} ${colorClass.border} border`
                    : isDisabled
                    ? 'border-gray-100 opacity-40 cursor-not-allowed'
                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => toggleCategory(cat)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  isSelected ? `${colorClass.border} bg-current` : 'border-gray-300'
                }`}>
                  {isSelected && (
                    <svg className={`w-2.5 h-2.5 ${colorClass.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm ${isSelected ? colorClass.text : 'text-gray-700'}`}>{cat}</span>
              </label>
            );
          })}
        </div>

        {/* Add custom category */}
        <div className="flex gap-2 pt-1">
          <input
            type="text"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomCategory())}
            placeholder="+ Aggiungi categoria personalizzata"
            className="flex-1 text-sm px-3 py-1.5 border border-dashed border-gray-300 rounded-lg focus:outline-none focus:border-[#1D9E75]"
          />
          {customCategory && (
            <button
              onClick={addCustomCategory}
              className="text-sm text-white bg-[#1D9E75] px-3 py-1.5 rounded-lg hover:bg-[#178a65] transition-colors"
            >
              Aggiungi
            </button>
          )}
        </div>
      </div>

      {/* Prompts per category */}
      <div className="bg-white border border-[#e5e5e2] rounded-xl p-5">
        <h3 className="font-semibold text-gray-900 text-sm mb-3">Prompts per Categoria</h3>
        <div className="flex gap-2 mb-3">
          {PROMPTS_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => onUpdate({ promptsPerCategory: n })}
              className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
                promptsPerCategory === n
                  ? 'border-[#1D9E75] bg-[#1D9E75]/10 text-[#1D9E75]'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        {selectedCategories.length > 0 && (
          <p className="text-xs text-gray-500">
            Totale: <strong>{totalPrompts} prompt</strong> su {selectedCategories.length}{' '}
            {selectedCategories.length === 1 ? 'categoria' : 'categorie'}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          ← Indietro
        </button>
        <button
          onClick={onNext}
          disabled={selectedCategories.length === 0}
          className="px-6 py-2.5 bg-[#1D9E75] text-white rounded-lg text-sm font-medium hover:bg-[#178a65] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Genera {totalPrompts} Prompt →
        </button>
      </div>
    </div>
  );
}
