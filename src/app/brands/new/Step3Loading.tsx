'use client';

import { useEffect, useState } from 'react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { OnboardingState } from './OnboardingWizard';

const CHECKLIST_ITEMS = [
  'Analyzing categories',
  'Crafting relevant search queries',
  'Optimizing for AI platforms',
  'Tailoring to your industry',
];

interface Props {
  state: OnboardingState;
  onUpdate: (partial: Partial<OnboardingState>) => void;
  onNext: () => void;
}

export function Step3Loading({ state, onUpdate, onNext }: Props) {
  const [progress, setProgress] = useState(0);
  const [checklistStatus, setChecklistStatus] = useState<boolean[]>([false, false, false, false]);
  const [error, setError] = useState('');

  const totalPrompts = state.selectedCategories.length * state.promptsPerCategory;

  useEffect(() => {
    generateQueries();
    // Animate checklist items progressively
    const timers = CHECKLIST_ITEMS.map((_, i) =>
      setTimeout(() => {
        setChecklistStatus((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
        setProgress(Math.round(((i + 1) / CHECKLIST_ITEMS.length) * 90));
      }, (i + 1) * 1500)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  async function generateQueries() {
    try {
      const res = await fetch('/api/llm/generate-queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: state.analysis?.name,
          aliases: state.aliases,
          categories: state.selectedCategories,
          promptsPerCategory: state.promptsPerCategory,
          country: state.country,
          language: state.language,
        }),
      });

      if (!res.ok) throw new Error('Errore nella generazione delle query');
      const data = await res.json();

      setProgress(100);
      onUpdate({ queries: data.queries ?? [] });

      setTimeout(() => onNext(), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    }
  }

  return (
    <div className="bg-white border border-[#e5e5e2] rounded-xl p-8 text-center">
      {/* Icon */}
      <div className="w-16 h-16 bg-[#1D9E75]/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <svg
          className="w-8 h-8 text-[#1D9E75] animate-pulse"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-1">
        Generating Prompts for {state.analysis?.name}
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Creating {totalPrompts} AI-optimized prompts...
      </p>

      {/* Progress card */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-5 text-left">
        <div className="flex items-center gap-3 mb-3">
          <svg className="w-4 h-4 text-[#1D9E75] animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-gray-600 font-medium">Crafting prompts...</span>
        </div>
        <ProgressBar value={progress} />
      </div>

      {/* Checklist */}
      <div className="space-y-2 text-left mb-5">
        {CHECKLIST_ITEMS.map((item, i) => (
          <div key={item} className="flex items-center gap-2.5 text-sm">
            {checklistStatus[i] ? (
              <div className="w-5 h-5 rounded-full bg-[#1D9E75] flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-200 flex-shrink-0" />
            )}
            <span className={checklistStatus[i] ? 'text-gray-900' : 'text-gray-400'}>{item}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400">Estimated time: 5-10 seconds</p>

      {error && (
        <div className="mt-4 text-sm text-[#D85A30] bg-[#D85A30]/5 border border-[#D85A30]/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
