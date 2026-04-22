/** Firma dibujada en formulario tiene prioridad; si no hay, usa la del perfil del usuario. */
export function firmaEfectiva(
  canvasOFormulario: string | null | undefined,
  perfil: string | null | undefined,
): string {
  const c = (canvasOFormulario ?? '').trim();
  if (c.startsWith('data:image')) {
    return c;
  }
  const p = (perfil ?? '').trim();
  if (p.startsWith('data:image')) {
    return p;
  }
  return '';
}
