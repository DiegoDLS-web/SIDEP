function normalizarRolCodigo(rol: string | null | undefined): string {
  return (rol ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

/** Solo capitán, tenientes y administrador pueden editar partes ya completados. */
export function puedeEditarParteCompletado(rol: string | null | undefined): boolean {
  const r = normalizarRolCodigo(rol);
  return (
    r === 'ADMIN'
    || r === 'ADMINISTRADOR'
    || r === 'CAPITAN'
    || r === 'TENIENTE'
  );
}
