import { describe, it, expect } from 'vitest';
import {
  calculateMetrics,
  detectMention,
  detectFirstPosition,
  aggregateCompetitors,
} from './metrics';
import type { Report } from '@/lib/db/schema';

// Minimal mock for a Report record
function makeReport(overrides: Partial<Report> = {}): Report {
  return {
    id: 'test-id',
    brandId: 'brand-id',
    runId: null,
    llm: 'chatgpt',
    queryId: 'query-id',
    queryText: 'test query',
    response: 'some response',
    isMentioned: false,
    isFirst: false,
    competitors: [],
    createdAt: new Date(),
    ...overrides,
  };
}

describe('calculateMetrics', () => {
  it('returns zeros for empty array', () => {
    const result = calculateMetrics([]);
    expect(result.mentionRate).toBe(0);
    expect(result.firstPositionRate).toBe(0);
    expect(result.totalMentions).toBe(0);
    expect(result.totalRuns).toBe(0);
  });

  it('calculates mention rate correctly', () => {
    const reports = [
      makeReport({ isMentioned: true }),
      makeReport({ isMentioned: true }),
      makeReport({ isMentioned: false }),
      makeReport({ isMentioned: false }),
    ];
    const result = calculateMetrics(reports);
    expect(result.mentionRate).toBe(50);
    expect(result.totalMentions).toBe(2);
    expect(result.totalRuns).toBe(4);
  });

  it('returns sentiment Positivo when rate >= 70', () => {
    const reports = Array.from({ length: 10 }, (_, i) =>
      makeReport({ isMentioned: i < 7 })
    );
    expect(calculateMetrics(reports).sentiment).toBe('Positivo');
  });

  it('returns sentiment Neutro when rate is between 40 and 70', () => {
    const reports = Array.from({ length: 10 }, (_, i) =>
      makeReport({ isMentioned: i < 5 })
    );
    expect(calculateMetrics(reports).sentiment).toBe('Neutro');
  });

  it('returns sentiment Basso when rate < 40', () => {
    const reports = Array.from({ length: 10 }, (_, i) =>
      makeReport({ isMentioned: i < 3 })
    );
    expect(calculateMetrics(reports).sentiment).toBe('Basso');
  });

  it('calculates first position rate correctly', () => {
    const reports = [
      makeReport({ isMentioned: true, isFirst: true }),
      makeReport({ isMentioned: true, isFirst: false }),
      makeReport({ isMentioned: false, isFirst: false }),
    ];
    const result = calculateMetrics(reports);
    expect(result.firstPositionRate).toBe(33);
  });
});

describe('detectMention', () => {
  it('detects brand name in text', () => {
    expect(detectMention('Coriweb è una grande agenzia', 'Coriweb')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(detectMention('CORIWEB is great', 'coriweb')).toBe(true);
  });

  it('returns false when brand not mentioned', () => {
    expect(detectMention('Un altro servizio digitale', 'Coriweb')).toBe(false);
  });

  it('detects via aliases', () => {
    // WHY: test che gli alias vengono controllati per non perdere menzioni alternative
    expect(detectMention('Lumi S.r.l. offre servizi digitali', 'Coriweb', ['Lumi S.r.l.', 'Lumi'])).toBe(true);
  });

  it('returns false when neither brand nor aliases match', () => {
    expect(detectMention('Qualcosa di diverso', 'Coriweb', ['Lumi'])).toBe(false);
  });
});

describe('detectFirstPosition', () => {
  it('returns true when brand appears before all competitors', () => {
    expect(
      detectFirstPosition('Coriweb è il migliore, poi Competitor A e Competitor B', 'Coriweb', [
        'Competitor A',
        'Competitor B',
      ])
    ).toBe(true);
  });

  it('returns false when brand not mentioned', () => {
    expect(
      detectFirstPosition('Competitor A e Competitor B sono ottimi', 'Coriweb', ['Competitor A'])
    ).toBe(false);
  });

  it('returns false when competitor appears before brand', () => {
    expect(
      detectFirstPosition('Competitor A è il top, poi Coriweb', 'Coriweb', ['Competitor A'])
    ).toBe(false);
  });

  it('returns true when no competitors in text', () => {
    expect(
      detectFirstPosition('Coriweb è eccellente per il marketing', 'Coriweb', ['Competitor A'])
    ).toBe(true);
  });

  it('returns true when brand mentioned and competitor list empty', () => {
    expect(detectFirstPosition('Coriweb domina il mercato', 'Coriweb', [])).toBe(true);
  });
});

describe('aggregateCompetitors', () => {
  it('aggregates and sorts competitors by count', () => {
    const reports = [
      makeReport({ competitors: ['A', 'B'] }),
      makeReport({ competitors: ['A', 'C'] }),
      makeReport({ competitors: ['A'] }),
    ];
    const result = aggregateCompetitors(reports);
    expect(result[0].name).toBe('A');
    expect(result[0].count).toBe(3);
    expect(result[0].percentage).toBe(100);
  });

  it('returns empty array for no reports', () => {
    expect(aggregateCompetitors([])).toEqual([]);
  });

  it('returns empty array when no competitors in reports', () => {
    const reports = [makeReport(), makeReport()];
    expect(aggregateCompetitors(reports)).toEqual([]);
  });
});
