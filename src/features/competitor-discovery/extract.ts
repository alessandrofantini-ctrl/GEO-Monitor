// WHY: estratto in slice separato perché la logica di competitor discovery
// potrebbe diventare più sofisticata (es. NER, embeddings) in futuro
export function parseCompetitorsFromJSON(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.competitors)) {
      return parsed.competitors.filter((c: unknown) => typeof c === 'string');
    }
    return [];
  } catch {
    return [];
  }
}
