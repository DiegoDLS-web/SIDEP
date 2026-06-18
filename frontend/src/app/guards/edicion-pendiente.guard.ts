import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ConfirmDialogService } from '../services/confirm-dialog.service';

export interface ComponenteConEdicionPendiente {
  tieneEdicionPendiente(): boolean;
}

export const edicionPendienteGuard: CanDeactivateFn<ComponenteConEdicionPendiente> = (component) => {
  const cmp = component as Partial<ComponenteConEdicionPendiente>;
  if (typeof cmp.tieneEdicionPendiente !== 'function' || !cmp.tieneEdicionPendiente()) {
    return true;
  }
  const confirm = inject(ConfirmDialogService);
  return confirm.abrir({
    title: 'Cambios sin guardar',
    message:
      'Tienes un registro o una edición en curso. Si cambias de módulo se descartarán los cambios. ¿Deseas salir igualmente?',
    confirmText: 'Descartar y salir',
    cancelText: 'Seguir editando',
  });
};
