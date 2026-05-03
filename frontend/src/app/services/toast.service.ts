import { Injectable } from '@angular/core';
import { BehaviorSubject, timer } from 'rxjs';
import { take } from 'rxjs/operators';

export type ToastTipo = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  tipo: ToastTipo;
  mensaje: string;
  duracionMs: number;
}

/**
 * Alertas tipo “toast” en esquina (crear / editar / borrar / errores).
 * Tras un `location.reload()` usar `programarTrasRecarga` + `consumirFlashAlIniciar` en el contenedor.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private static readonly FLASH_KEY = 'sidep_toast_flash';

  private id = 0;
  private readonly items = new BehaviorSubject<ToastItem[]>([]);
  readonly items$ = this.items.asObservable();

  private readonly duracionDefaultMs = 4500;

  exito(mensaje: string, duracionMs = this.duracionDefaultMs): void {
    this.mostrar('success', mensaje, duracionMs);
  }

  error(mensaje: string, duracionMs = this.duracionDefaultMs): void {
    this.mostrar('error', mensaje, duracionMs);
  }

  info(mensaje: string, duracionMs = this.duracionDefaultMs): void {
    this.mostrar('info', mensaje, duracionMs);
  }

  advertencia(mensaje: string, duracionMs = this.duracionDefaultMs): void {
    this.mostrar('warning', mensaje, duracionMs);
  }

  cerrar(id: number): void {
    this.items.next(this.items.value.filter((t) => t.id !== id));
  }

  /** Guarda mensaje para mostrarlo al recargar la página (p. ej. tras editar un parte). */
  programarTrasRecarga(mensaje: string): void {
    sessionStorage.setItem(ToastService.FLASH_KEY, mensaje);
  }

  /** Lo llama el contenedor al iniciar: muestra el mensaje pendiente y lo borra del storage. */
  consumirFlashAlIniciar(): void {
    const raw = sessionStorage.getItem(ToastService.FLASH_KEY);
    if (!raw) {
      return;
    }
    sessionStorage.removeItem(ToastService.FLASH_KEY);
    this.exito(raw);
  }

  private mostrar(tipo: ToastTipo, mensaje: string, duracionMs: number): void {
    const nuevo: ToastItem = { id: ++this.id, tipo, mensaje, duracionMs };
    this.items.next([...this.items.value, nuevo]);
    if (duracionMs > 0) {
      timer(duracionMs)
        .pipe(take(1))
        .subscribe(() => this.cerrar(nuevo.id));
    }
  }
}
