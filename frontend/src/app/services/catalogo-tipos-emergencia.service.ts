import { Injectable, inject, signal } from '@angular/core';
import { ConfiguracionesService } from './configuraciones.service';
import {
  CLAVES_EMERGENCIA,
  CLAVES_MODULOS_SIDEP,
  VALORES_CLAVE_MODULO_SIDEP,
} from '../pages/partes/partes.constants';

const ETIQUETA_POR_VALOR = new Map(
  CLAVES_EMERGENCIA.filter((c) => c.value !== 'todos').map((c) => [c.value, c.label]),
);
import type { TipoEmergenciaItemDto } from '../models/configuracion.dto';

export type ClaveEmergenciaOpcion = { value: string; label: string };

/**
 * Catálogo de tipos (`claveEmergencia`) desde configuración del sistema, con fallback al bundle estático.
 */
@Injectable({ providedIn: 'root' })
export class CatalogoTiposEmergenciaService {
  private readonly configApi = inject(ConfiguracionesService);

  /** Incluye opción `todos` para filtros de listado. */
  readonly clavesEmergencia = signal<ClaveEmergenciaOpcion[]>(CLAVES_EMERGENCIA);

  constructor() {
    this.reload();
  }

  reload(): void {
    this.configApi.obtener().subscribe({
      next: (cfg) => {
        if (cfg.tiposEmergencia && cfg.tiposEmergencia.length > 0) {
          const conTodos: ClaveEmergenciaOpcion[] = [
            { value: 'todos', label: 'Todos los tipos' },
            ...cfg.tiposEmergencia.map((t) => {
              const value = String(t.value ?? '').trim();
              const raw = String(t.label ?? '').trim();
              const label = raw || ETIQUETA_POR_VALOR.get(value) || value;
              return { value, label };
            }),
          ];
          this.clavesEmergencia.set(conTodos);
        } else {
          this.clavesEmergencia.set(CLAVES_EMERGENCIA);
        }
      },
      error: () => this.clavesEmergencia.set(CLAVES_EMERGENCIA),
    });
  }

  etiqueta(clave: string): string {
    return this.clavesEmergencia().find((c) => c.value === clave)?.label ?? clave;
  }

  nuevosParte(): ClaveEmergenciaOpcion[] {
    return this.clavesEmergencia().filter((c) => c.value !== 'todos');
  }

  operativas(): ClaveEmergenciaOpcion[] {
    return this.nuevosParte().filter((c) => /^10/.test(c.value));
  }

  companiaServicios(): ClaveEmergenciaOpcion[] {
    const servicios = this.nuevosParte().filter(
      (c) => !/^10/.test(c.value) && !VALORES_CLAVE_MODULO_SIDEP.has(c.value),
    );
    return [...servicios, ...this.modulosSidep()];
  }

  /** Nuevo parte: compañía/servicios sin Checklist ERA/Unidad/Bolso (solo listados en otros filtros). */
  companiaServiciosParte(): ClaveEmergenciaOpcion[] {
    return this.nuevosParte().filter(
      (c) => !/^10/.test(c.value) && !VALORES_CLAVE_MODULO_SIDEP.has(c.value),
    );
  }

  /** Checklist, ERA y bolso: siempre visibles en filtros; etiqueta desde catálogo guardado o texto base. */
  modulosSidep(): ClaveEmergenciaOpcion[] {
    const map = new Map(this.nuevosParte().map((c) => [c.value, c]));
    return CLAVES_MODULOS_SIDEP.map((def) => map.get(def.value) ?? def);
  }

  claveEnCatalogo(v: string): boolean {
    const t = (v ?? '').trim();
    return this.nuevosParte().some((c) => c.value === t);
  }

  /** Para pantalla de edición: solo tipos almacenados (sin `todos`). */
  tiposRawParaEditar(): TipoEmergenciaItemDto[] {
    return this.nuevosParte().map((x) => ({ value: x.value, label: x.label }));
  }
}
