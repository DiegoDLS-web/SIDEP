/** Primer valor de query string (Express puede entregar string | string[]). */
export function firstQueryString(q: unknown): string | undefined {
  if (typeof q === 'string') return q;
  if (Array.isArray(q) && typeof q[0] === 'string') return q[0];
  return undefined;
}
