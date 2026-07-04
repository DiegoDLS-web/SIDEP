import type { CambioEstadoDialogResult } from '../services/cambio-estado-dialog.service';
import { CambioEstadoDialogService } from '../services/cambio-estado-dialog.service';

export async function solicitarMotivoCambioEstado(
  dialog: CambioEstadoDialogService,
  opts: {
    message: string;
    title?: string;
    estadoAnterior?: string;
    estadoNuevo?: string;
  },
): Promise<CambioEstadoDialogResult | null> {
  return dialog.abrir(opts);
}
