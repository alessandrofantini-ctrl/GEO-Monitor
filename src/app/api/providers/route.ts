import { NextResponse } from 'next/server';
import { getAvailableProviders } from '@/features/llm-analysis/providers/router';

// WHY: il frontend chiama questo endpoint per sapere quali LLM mostrare
// come attivi/disabilitati senza esporre le env vars al client
export async function GET() {
  return NextResponse.json({ providers: getAvailableProviders() });
}
