/** Descarga binaria desde API con cookie de sesión. */
export async function descargarDesdeApi(path: string, nombreArchivo?: string): Promise<void> {
  const res = await fetch(path, { credentials: 'include' });
  if (!res.ok) {
    let msg = 'No se pudo descargar el archivo';
    try {
      const json = await res.json();
      msg = json.message ?? json.error ?? msg;
    } catch {
      /* respuesta no JSON */
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = /filename="?([^";]+)"?/.exec(disposition);
  const filename = nombreArchivo ?? match?.[1] ?? 'descarga';
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function queryString(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v?.trim()) qs.set(k, v.trim());
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}
