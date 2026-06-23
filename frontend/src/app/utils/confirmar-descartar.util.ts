import type { ConfirmDialogService } from '../services/confirm-dialog.service';

/** Pide confirmación antes de cerrar un modal o formulario con datos sin guardar. */
export async function confirmarDescartarCambios(
  confirm: ConfirmDialogService,
  tieneCambios: boolean,
  opts?: { title?: string; message?: string; confirmText?: string; cancelText?: string },
): Promise<boolean> {
  if (!tieneCambios) return true;
  return confirm.abrir({
    title: opts?.title ?? 'Descartar cambios',
    message:
      opts?.message ??
      'Tienes datos sin guardar. Si cierras ahora se perderán los cambios. ¿Deseas continuar?',
    confirmText: opts?.confirmText ?? 'Descartar',
    cancelText: opts?.cancelText ?? 'Seguir editando',
  });
}
