/** Extrae filas usr-* de `metadata.asistencia.asistenciaPorContexto` (misma lógica que reportes). */
export function extraerAsistenciasMetadata(metadata: unknown): Array<{ usuarioId: number; presente: boolean }> {
  const meta = metadata as
    | {
        asistencia?: { asistenciaPorContexto?: Record<string, Record<string, boolean>> };
      }
    | null;
  const apc = meta?.asistencia?.asistenciaPorContexto;
  if (!apc || typeof apc !== 'object') return [];
  const out: Array<{ usuarioId: number; presente: boolean }> = [];
  for (const mapa of Object.values(apc)) {
    if (!mapa || typeof mapa !== 'object') continue;
    for (const [k, v] of Object.entries(mapa)) {
      if (!k.startsWith('usr-')) continue;
      const uid = Number(k.slice(4));
      if (!Number.isFinite(uid) || uid <= 0) continue;
      out.push({ usuarioId: uid, presente: Boolean(v) });
    }
  }
  return out;
}
