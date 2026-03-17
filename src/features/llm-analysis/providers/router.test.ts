import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAvailableProviders } from './router';

describe('getAvailableProviders', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('marks chatgpt available when OPENAI_API_KEY set', () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    vi.stubEnv('GEMINI_API_KEY', '');
    const providers = getAvailableProviders();
    const chatgpt = providers.find((p) => p.id === 'chatgpt');
    expect(chatgpt?.available).toBe(true);
  });

  it('marks claude unavailable when ANTHROPIC_API_KEY not set', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    const providers = getAvailableProviders();
    const claude = providers.find((p) => p.id === 'claude');
    expect(claude?.available).toBe(false);
  });

  it('marks gemini available when GEMINI_API_KEY set', () => {
    vi.stubEnv('GEMINI_API_KEY', 'AI-test-key');
    const providers = getAvailableProviders();
    const gemini = providers.find((p) => p.id === 'gemini');
    expect(gemini?.available).toBe(true);
  });

  it('returns exactly 3 providers', () => {
    const providers = getAvailableProviders();
    expect(providers).toHaveLength(3);
  });
});
