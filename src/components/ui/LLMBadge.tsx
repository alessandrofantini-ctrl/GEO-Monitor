'use client';

import { LLM_COLORS } from '@/lib/utils';

interface LLMBadgeProps {
  llm: string;
  size?: 'sm' | 'md';
}

export function LLMBadge({ llm, size = 'md' }: LLMBadgeProps) {
  const style = LLM_COLORS[llm] ?? { bg: 'bg-gray-100', text: 'text-gray-600', label: llm };
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1';

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${style.bg} ${style.text} ${sizeClass}`}>
      {style.label}
    </span>
  );
}
