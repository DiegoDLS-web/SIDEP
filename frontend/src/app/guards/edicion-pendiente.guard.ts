import { CanDeactivateFn } from '@angular/router';

export interface ComponenteConEdicionPendiente {
  tieneEdicionPendiente(): boolean;
}

/** Guard desactivado: ya no se muestra confirmación «Cambios sin guardar» al navegar. */
export const edicionPendienteGuard: CanDeactivateFn<ComponenteConEdicionPendiente> = () => true;
