'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { Step1BrandForm } from './Step1BrandForm';
import { Step2ReviewCategories } from './Step2ReviewCategories';
import { Step3Loading } from './Step3Loading';
import { Step4ReviewPrompts } from './Step4ReviewPrompts';
import type { SiteAnalysisResult, GeneratedQuery } from '@/features/brands/types';

const STEPS = [
  { label: 'Brand Analysis', index: 0 },
  { label: 'Generate Prompts', index: 1 },
  { label: 'Test Visibility', index: 2 },
  { label: 'Results', index: 3 },
];

export interface OnboardingState {
  // Step 1 input
  url: string;
  country: string;
  language: string;
  platforms: string[];
  // Step 2 data (from site-analyze)
  analysis: SiteAnalysisResult | null;
  selectedCategories: string[];
  promptsPerCategory: number;
  aliases: string[];
  // Step 3 data (generated queries)
  queries: GeneratedQuery[];
}

const INITIAL_STATE: OnboardingState = {
  url: '',
  country: 'Italy',
  language: 'Italiano',
  platforms: ['chatgpt'],
  analysis: null,
  selectedCategories: [],
  promptsPerCategory: 5,
  aliases: [],
  queries: [],
};

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE);

  function updateState(partial: Partial<OnboardingState>) {
    setState((prev) => ({ ...prev, ...partial }));
  }

  return (
    <div>
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Aggiungi nuovo brand</h1>
        <p className="text-sm text-gray-500 mt-1">Analizza la visibilità del brand sugli LLM</p>
      </div>

      {/* Step indicator */}
      <div className="bg-white border border-[#e5e5e2] rounded-xl p-5 mb-6">
        <StepIndicator steps={STEPS} currentStep={step} />
      </div>

      {/* Step content */}
      {step === 0 && (
        <Step1BrandForm
          state={state}
          onUpdate={updateState}
          onNext={() => setStep(1)}
        />
      )}
      {step === 1 && (
        <Step2ReviewCategories
          state={state}
          onUpdate={updateState}
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}
      {step === 2 && (
        <Step3Loading
          state={state}
          onUpdate={updateState}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <Step4ReviewPrompts
          state={state}
          onUpdate={updateState}
          onSave={(brandId) => router.push(`/run/${brandId}`)}
        />
      )}
    </div>
  );
}
