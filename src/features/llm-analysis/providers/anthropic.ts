// WHY: stub attivato solo se ANTHROPIC_API_KEY presente — il frontend
// legge /api/providers per sapere quali LLM mostrare come attivi (ADR-0004)
export async function callAnthropic(system: string, user: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${error}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || '';
}
