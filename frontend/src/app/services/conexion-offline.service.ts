import { Injectable, inject } from '@angular/core';
import { ToastService } from './toast.service';

/** Evento global para forzar guardado local inmediato al perder conexión. */
export const SIDEP_EVENTO_OFFLINE = 'sidep:offline';

@Injectable({ providedIn: 'root' })
export class ConexionOfflineService {
  private readonly toast = inject(ToastService);
  private escuchaActiva = false;
  private offlineNotificado = false;

  iniciarEscucha(): void {
    if (this.escuchaActiva || typeof window === 'undefined') return;
    this.escuchaActiva = true;

    window.addEventListener('offline', () => this.onOffline());
    window.addEventListener('online', () => {
      this.offlineNotificado = false;
    });

    if (!navigator.onLine) {
      this.onOffline();
    }
  }

  private onOffline(): void {
    window.dispatchEvent(new CustomEvent(SIDEP_EVENTO_OFFLINE));
    if (this.offlineNotificado) return;
    this.offlineNotificado = true;
    this.toast.advertencia(
      'Se perdió la conexión a internet, pero no te preocupes: tu trabajo se guarda localmente en este dispositivo.',
      9000,
    );
  }
}
