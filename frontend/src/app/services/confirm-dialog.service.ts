import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

type ConfirmState = {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant: 'default' | 'logout';
};

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private resolver: ((value: boolean) => void) | null = null;
  private readonly state = new BehaviorSubject<ConfirmState>({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    variant: 'default',
  });

  readonly state$ = this.state.asObservable();

  abrir(opts: {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'logout';
  }): Promise<boolean> {
    if (this.resolver) {
      this.resolver(false);
      this.resolver = null;
    }
    this.state.next({
      open: true,
      title: opts.title?.trim() || 'Confirmar acción',
      message: opts.message,
      confirmText: opts.confirmText?.trim() || 'Confirmar',
      cancelText: opts.cancelText?.trim() || 'Cancelar',
      variant: opts.variant ?? 'default',
    });
    document.body.classList.add('confirm-open');
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  confirmar(): void {
    this.cerrarConResultado(true);
  }

  cancelar(): void {
    this.cerrarConResultado(false);
  }

  private cerrarConResultado(valor: boolean): void {
    this.state.next({ ...this.state.value, open: false });
    document.body.classList.remove('confirm-open');
    this.resolver?.(valor);
    this.resolver = null;
  }
}
