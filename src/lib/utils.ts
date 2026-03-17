// WHY: categoria → colore deterministico, così la stessa categoria
// ha sempre lo stesso colore tra sessioni diverse
const CATEGORY_COLORS = [
  'purple',
  'teal',
  'coral',
  'amber',
  'blue',
  'green',
  'pink',
  'indigo',
] as const;

export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export function getCategoryColor(index: number): CategoryColor {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

export const COLOR_CLASSES: Record<CategoryColor, { bg: string; text: string; border: string }> = {
  purple: { bg: 'bg-[#7F77DD]/10', text: 'text-[#7F77DD]', border: 'border-[#7F77DD]/30' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  coral: { bg: 'bg-[#D85A30]/10', text: 'text-[#D85A30]', border: 'border-[#D85A30]/30' },
  amber: { bg: 'bg-[#BA7517]/10', text: 'text-[#BA7517]', border: 'border-[#BA7517]/30' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  green: { bg: 'bg-[#1D9E75]/10', text: 'text-[#1D9E75]', border: 'border-[#1D9E75]/30' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
};

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getMentionRateColor(rate: number): string {
  if (rate >= 70) return 'text-[#1D9E75]';
  if (rate >= 40) return 'text-[#BA7517]';
  return 'text-[#D85A30]';
}

export function getMentionRateBadgeClass(rate: number): string {
  if (rate >= 70) return 'bg-[#1D9E75]/10 text-[#1D9E75] border-[#1D9E75]/30';
  if (rate >= 40) return 'bg-[#BA7517]/10 text-[#BA7517] border-[#BA7517]/30';
  return 'bg-[#D85A30]/10 text-[#D85A30] border-[#D85A30]/30';
}

export const LLM_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  chatgpt: { bg: 'bg-green-50', text: 'text-green-700', label: 'ChatGPT' },
  claude: { bg: 'bg-[#7F77DD]/10', text: 'text-[#7F77DD]', label: 'Claude' },
  gemini: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Gemini' },
};
