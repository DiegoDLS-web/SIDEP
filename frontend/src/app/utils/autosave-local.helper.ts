import type { BorradorLocalService, BorradorLocalTipo } from '../services/borrador-local.service';
import { SIDEP_EVENTO_OFFLINE } from '../services/conexion-offline.service';

export type AutosaveLocalOpts = {
  debounceMs?: number;
  /** Si devuelve false, no persiste (p. ej. mientras carga). */
  habilitado?: () => boolean;
};

/** Guardado local con debounce para formularios largos. */
export class AutosaveLocal {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly offlineHandler: () => void;

  constructor(
    private readonly borradorLocal: BorradorLocalService,
    private readonly tipo: BorradorLocalTipo,
    private readonly getClave: () => string,
    private readonly getPayload: () => unknown,
    private readonly opts: AutosaveLocalOpts = {},
  ) {
    this.offlineHandler = () => this.flush();
    if (typeof window !== 'undefined') {
      window.addEventListener(SIDEP_EVENTO_OFFLINE, this.offlineHandler);
    }
  }

  programar(): void {
    if (this.opts.habilitado && !this.opts.habilitado()) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.persistir(), this.opts.debounceMs ?? 1500);
  }

  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.persistir();
  }

  destruir(): void {
    if (this.timer) clearTimeout(this.timer);
    if (typeof window !== 'undefined') {
      window.removeEventListener(SIDEP_EVENTO_OFFLINE, this.offlineHandler);
    }
  }

  private persistir(): void {
    if (this.opts.habilitado && !this.opts.habilitado()) return;
    try {
      const payload = this.getPayload();
      if (payload == null) return;
      this.borradorLocal.guardar(this.tipo, this.getClave(), payload);
    } catch {
      /* quota / privado */
    }
  }
}
