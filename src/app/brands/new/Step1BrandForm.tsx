'use client';

import { useState } from 'react';
import type { OnboardingState } from './OnboardingWizard';

const COUNTRIES = ['Italy', 'United States', 'United Kingdom', 'Germany', 'France', 'Spain', 'Other'];
const LANGUAGES = ['Italiano', 'English', 'Deutsch', 'Français', 'Español'];
const PLATFORMS_STANDARD = [
  { id: 'chatgpt', label: 'ChatGPT 4o', available: true },
  { id: 'claude', label: 'Claude', available: true },
];
const PLATFORMS_PREMIUM = [
  { id: 'gemini', label: 'Gemini', available: false },
  { id: 'perplexity', label: 'Perplexity', available: false },
];

interface Props {
  state: OnboardingState;
  onUpdate: (partial: Partial<OnboardingState>) => void;
  onNext: () => void;
}

export function Step1BrandForm({ state, onUpdate, onNext }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/site-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: state.url,
          country: state.country,
          language: state.language,
        }),
      });

      if (!res.ok) throw new Error('Errore nell\'analisi del sito');
      const analysis = await res.json();

      onUpdate({
        analysis,
        aliases: analysis.aliases ?? [],
        selectedCategories: (analysis.categories ?? []).slice(0, 3),
      });
      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }

  function togglePlatform(id: string) {
    const current = state.platforms;
    if (current.includes(id)) {
      onUpdate({ platforms: current.filter((p) => p !== id) });
    } else {
      onUpdate({ platforms: [...current, id] });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-[#e5e5e2] rounded-xl p-6 space-y-5">
      <h2 className="font-semibold text-gray-900">Brand Analysis</h2>

      {/* URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Website URL <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          required
          placeholder="https://example.com"
          value={state.url}
          onChange={(e) => onUpdate({ url: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75]"
        />
      </div>

      {/* Country + Language */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Country</label>
          <select
            value={state.country}
            onChange={(e) => onUpdate({ country: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75] bg-white"
          >
            {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Language</label>
          <select
            value={state.language}
            onChange={(e) => onUpdate({ language: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75] bg-white"
          >
            {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* AI Platforms */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">AI Platform(s)</label>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wide">Standard</p>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS_STANDARD.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg cursor-pointer transition-colors text-sm ${
                    state.platforms.includes(p.id)
                      ? 'border-[#1D9E75] bg-[#1D9E75]/5 text-[#1D9E75]'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={state.platforms.includes(p.id)}
                    onChange={() => togglePlatform(p.id)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wide">Premium (coming soon)</p>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS_PREMIUM.map((p) => (
                <span
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-1.5 border border-gray-100 rounded-lg text-sm text-gray-300 cursor-not-allowed"
                >
                  {p.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm text-[#D85A30] bg-[#D85A30]/5 border border-[#D85A30]/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !state.url || state.platforms.length === 0}
        className="w-full py-2.5 bg-[#1D9E75] text-white rounded-lg text-sm font-medium hover:bg-[#178a65] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analisi in corso...
          </>
        ) : (
          'Analizza sito →'
        )}
      </button>
    </form>
  );
}
