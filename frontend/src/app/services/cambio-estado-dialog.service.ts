import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type CambioEstadoDialogResult = {
  motivo: string;
  fecha: string;
};

type CambioEstadoDialogState = {
  open: boolean;
  title: string;
  message: string;
  estadoAnterior?: string;
  estadoNuevo?: string;
  confirmText: string;
  cancelText: string;
  motivo: string;
  fecha: string;
  error: string | null;
};

@Injectable({ providedIn: 'root' })
export class CambioEstadoDialogService {
  private resolver: ((value: CambioEstadoDialogResult | null) => void) | null = null;

  private readonly state = new BehaviorSubject<CambioEstadoDialogState>(this.estadoInicial());

  readonly state$ = this.state.asObservable();

  abrir(opts: {
    title?: string;
    message: string;
    estadoAnterior?: string;
    estadoNuevo?: string;
    confirmText?: string;
    cancelText?: string;
    fechaDefault?: string;
  }): Promise<CambioEstadoDialogResult | null> {
    if (this.resolver) {
      this.resolver(null);
      this.resolver = null;
    }

    const hoy = opts.fechaDefault ?? new Date().toISOString().slice(0, 10);
    this.state.next({
      open: true,
      title: opts.title?.trim() || 'Confirmar cambio de estado',
      message: opts.message,
      estadoAnterior: opts.estadoAnterior,
      estadoNuevo: opts.estadoNuevo,
      confirmText: opts.confirmText?.trim() || 'Confirmar cambio',
      cancelText: opts.cancelText?.trim() || 'Cancelar',
      motivo: '',
      fecha: hoy,
      error: null,
    });
    document.body.classList.add('confirm-open');

    return new Promise<CambioEstadoDialogResult | null>((resolve) => {
      this.resolver = resolve;
    });
  }

  actualizarMotivo(valor: string): void {
    const s = this.state.value;
    if (!s.open) return;
    this.state.next({ ...s, motivo: valor, error: null });
  }

  actualizarFecha(valor: string): void {
    const s = this.state.value;
    if (!s.open) return;
    this.state.next({ ...s, fecha: valor, error: null });
  }

  confirmar(): void {
    const s = this.state.value;
    const motivo = s.motivo.trim();
    const fecha = s.fecha.trim();
    if (motivo.length < 8) {
      this.state.next({ ...s, error: 'Indica el motivo del cambio (mínimo 8 caracteres).' });
      return;
    }
    if (!fecha) {
      this.state.next({ ...s, error: 'Indica la fecha del cambio.' });
      return;
    }
    this.cerrarConResultado({ motivo, fecha });
  }

  cancelar(): void {
    this.cerrarConResultado(null);
  }

  private cerrarConResultado(valor: CambioEstadoDialogResult | null): void {
    document.body.classList.remove('confirm-open');
    this.state.next(this.estadoInicial());
    const resolve = this.resolver;
    this.resolver = null;
    resolve?.(valor);
  }

  private estadoInicial(): CambioEstadoDialogState {
    return {
      open: false,
      title: '',
      message: '',
      confirmText: 'Confirmar cambio',
      cancelText: 'Cancelar',
      motivo: '',
      fecha: new Date().toISOString().slice(0, 10),
      error: null,
    };
  }
}
