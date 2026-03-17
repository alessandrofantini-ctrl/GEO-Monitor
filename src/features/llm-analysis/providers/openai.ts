// WHY: tutto passa da qui per centralizzare error handling e logging futuro.
// Non usare fetch direttamente nelle API route — sempre tramite questo modulo.
export async function callOpenAI(
  system: string,
  user: string,
  options: { maxTokens?: number; jsonMode?: boolean } = {}
): Promise<string> {
  const { maxTokens = 1500, jsonMode = false } = options;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: maxTokens,
      ...(jsonMode && { response_format: { type: 'json_object' } }),
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${error}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}
