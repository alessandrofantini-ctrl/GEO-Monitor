import { callOpenAI } from './openai';
import { callAnthropic } from './anthropic';
import { callGemini } from './gemini';

export type LLMProvider = 'chatgpt' | 'claude' | 'gemini';

// WHY: i provider stub restituiscono errore se la key manca —
// il frontend mostra il toggle disabilitato di conseguenza (ADR-0004)
export async function callLLM(
  llm: LLMProvider,
  system: string,
  user: string
): Promise<string> {
  switch (llm) {
    case 'chatgpt':
      return callOpenAI(system, user);
    case 'claude':
      return callAnthropic(system, user);
    case 'gemini':
      return callGemini(system, user);
    default:
      throw new Error(`Unknown LLM provider: ${llm}`);
  }
}

// Returns which providers are configured based on env vars
export function getAvailableProviders(): { id: LLMProvider; available: boolean; label: string }[] {
  return [
    { id: 'chatgpt', available: !!process.env.OPENAI_API_KEY, label: 'ChatGPT 4o' },
    { id: 'claude', available: !!process.env.ANTHROPIC_API_KEY, label: 'Claude' },
    { id: 'gemini', available: !!process.env.GEMINI_API_KEY, label: 'Gemini' },
  ];
}
