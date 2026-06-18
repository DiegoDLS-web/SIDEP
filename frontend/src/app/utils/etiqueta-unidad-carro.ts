import type { CarroDto } from '../models/carro.dto';

/** Misma etiqueta que el filtro de historial de mantención en Carros. */
export function etiquetaUnidadCarro(c: Pick<CarroDto, 'nomenclatura' | 'nombre' | 'patente'>): string {
  const nom = (c.nomenclatura ?? '').trim();
  const det = (c.nombre ?? c.patente ?? '').trim();
  if (!nom) return det || 'Unidad';
  return det ? `${nom} — ${det}` : nom;
}
