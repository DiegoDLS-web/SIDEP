import { ErrorHandler, Injectable, Injector, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Injectable()
export class SidGlobalErrorHandler implements ErrorHandler {
  private readonly injector = inject(Injector);

  handleError(error: unknown): void {
    console.error('[SIDEP] Error no capturado:', error);
    try {
      const toast = this.injector.get(ToastService);
      toast.error('Ocurrió un error inesperado. Si persiste, contacta al administrador.');
    } catch {
      // Toast no disponible durante bootstrap
    }
  }
}
