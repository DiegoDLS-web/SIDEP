/**
 * Cliente LLM genérico (OpenAI-compatible).
 * Variables: IA_API_KEY, IA_BASE_URL (default https://api.openai.com/v1), IA_MODEL (default gpt-4o-mini)
 */
export function iaDisponible(): boolean {
  return Boolean(process.env.IA_API_KEY?.trim());
}

export type IaChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function completarJson<T = unknown>(
  messages: IaChatMessage[],
  opts?: { temperature?: number; maxTokens?: number },
): Promise<{ ok: true; data: T; raw: string } | { ok: false; error: string }> {
  const apiKey = process.env.IA_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: 'IA no configurada (falta IA_API_KEY).' };
  }

  const base = (process.env.IA_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.IA_MODEL?.trim() || 'gpt-4o-mini';

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: opts?.temperature ?? 0.2,
        max_tokens: opts?.maxTokens ?? 1200,
        response_format: { type: 'json_object' },
        messages,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, error: `Proveedor IA HTTP ${res.status}: ${text.slice(0, 240)}` };
    }

    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = body.choices?.[0]?.message?.content?.trim() || '{}';
    try {
      return { ok: true, data: JSON.parse(raw) as T, raw };
    } catch {
      return { ok: false, error: 'La IA no devolvió JSON válido.' };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error al llamar al proveedor IA.' };
  }
}

export async function completarTexto(
  messages: IaChatMessage[],
  opts?: { temperature?: number; maxTokens?: number },
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const apiKey = process.env.IA_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: 'IA no configurada (falta IA_API_KEY).' };
  }

  const base = (process.env.IA_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.IA_MODEL?.trim() || 'gpt-4o-mini';

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: opts?.temperature ?? 0.3,
        max_tokens: opts?.maxTokens ?? 800,
        messages,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, error: `Proveedor IA HTTP ${res.status}: ${text.slice(0, 240)}` };
    }

    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = body.choices?.[0]?.message?.content?.trim() || '';
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error al llamar al proveedor IA.' };
  }
}
