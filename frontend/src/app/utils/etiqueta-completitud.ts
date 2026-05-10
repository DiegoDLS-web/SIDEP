/** Etiqueta de progreso para barras (sustituye "Completitud" / "Completitud general"). */
export function etiquetaCompletandoOCompletado(porcentaje: number): 'Completando' | 'Completado' {
  return (porcentaje ?? 0) >= 100 ? 'Completado' : 'Completando';
}
