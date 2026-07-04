import { Injectable } from '@angular/core';

export type BorradorLocalTipo =
  | 'checklist-unidad'
  | 'checklist-era'
  | 'bolso-trauma'
  | 'parte'
  | 'carro-mantenimiento';

export type BorradorSyncKind =
  | 'checklist-unidad'
  | 'checklist-era'
  | 'bolso-trauma'
  | 'parte-crear'
  | 'parte-actualizar'
  | 'carro-mantenimiento-crear'
  | 'carro-mantenimiento-editar';

export interface BorradorSyncRequest {
  kind: BorradorSyncKind;
  unidad?: string;
  carroId?: string | number;
  parteId?: string | number | null;
  mantenimientoEditId?: string | null;
  body: Record<string, unknown>;
}

export interface BorradorLocalEnvelope<T = unknown> {
  meta: {
    guardadoEn: string;
    tipo: BorradorLocalTipo;
    clave: string;
  };
  payload: T;
  syncRequest?: BorradorSyncRequest;
}

@Injectable({ providedIn: 'root' })
export class BorradorLocalService {
  private readonly prefix = 'sidep_borrador_local_v1:';

  guardar<T>(
    tipo: BorradorLocalTipo,
    clave: string,
    payload: T,
    syncRequest?: BorradorSyncRequest,
  ): void {
    try {
      const envelope: BorradorLocalEnvelope<T> = {
        meta: {
          guardadoEn: new Date().toISOString(),
          tipo,
          clave,
        },
        payload,
        ...(syncRequest ? { syncRequest } : {}),
      };
      localStorage.setItem(this.storageKey(tipo, clave), JSON.stringify(envelope));
    } catch {
      /* quota / modo privado */
    }
  }

  obtener<T>(tipo: BorradorLocalTipo, clave: string): BorradorLocalEnvelope<T> | null {
    try {
      const raw = localStorage.getItem(this.storageKey(tipo, clave));
      if (!raw) return null;
      return JSON.parse(raw) as BorradorLocalEnvelope<T>;
    } catch {
      return null;
    }
  }

  eliminar(tipo: BorradorLocalTipo, clave: string): void {
    try {
      localStorage.removeItem(this.storageKey(tipo, clave));
    } catch {
      /* ignore */
    }
  }

  existe(tipo: BorradorLocalTipo, clave: string): boolean {
    return this.obtener(tipo, clave) != null;
  }

  listarTodos(): BorradorLocalEnvelope[] {
    const out: BorradorLocalEnvelope[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(this.prefix)) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as BorradorLocalEnvelope;
        if (parsed?.meta?.tipo && parsed.meta.clave && parsed.syncRequest) {
          out.push(parsed);
        }
      }
    } catch {
      /* ignore */
    }
    return out.sort(
      (a, b) => new Date(a.meta.guardadoEn).getTime() - new Date(b.meta.guardadoEn).getTime(),
    );
  }

  private storageKey(tipo: BorradorLocalTipo, clave: string): string {
    return `${this.prefix}${tipo}:${clave}`;
  }
}
