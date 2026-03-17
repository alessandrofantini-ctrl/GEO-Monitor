import type { Report } from '@/lib/db/schema';

// WHY: logica pura senza side effects — facile da testare con Vitest
export function calculateMetrics(reports: Report[]) {
  const total = reports.length;
  const mentioned = reports.filter((r) => r.isMentioned).length;
  const first = reports.filter((r) => r.isFirst).length;
  const mentionRate = total > 0 ? Math.round((mentioned / total) * 100) : 0;

  return {
    mentionRate,
    firstPositionRate: total > 0 ? Math.round((first / total) * 100) : 0,
    totalMentions: mentioned,
    totalRuns: total,
    sentiment:
      mentionRate >= 70 ? 'Positivo' : mentionRate >= 40 ? 'Neutro' : 'Basso',
  };
}

export function detectMention(
  text: string,
  brandName: string,
  aliases: string[] = []
): boolean {
  // WHY: controlliamo anche gli alias per non perdere menzioni con nomi alternativi
  // es. "Lumi S.r.l." e "Coriweb" devono essere rilevati come menzioni di "Lumi"
  const allNames = [brandName, ...aliases];
  const lower = text.toLowerCase();
  return allNames.some((name) => lower.includes(name.toLowerCase()));
}

export function detectFirstPosition(
  text: string,
  brandName: string,
  competitors: string[]
): boolean {
  const lower = text.toLowerCase();
  const brandIdx = lower.indexOf(brandName.toLowerCase());
  if (brandIdx === -1) return false;
  return competitors.every((c) => {
    const ci = lower.indexOf(c.toLowerCase());
    return ci === -1 || ci > brandIdx;
  });
}

export function aggregateCompetitors(
  reports: Report[]
): { name: string; count: number; percentage: number }[] {
  const counts: Record<string, number> = {};
  const total = reports.length;

  for (const report of reports) {
    for (const competitor of report.competitors ?? []) {
      counts[competitor] = (counts[competitor] ?? 0) + 1;
    }
  }

  return Object.entries(counts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}
