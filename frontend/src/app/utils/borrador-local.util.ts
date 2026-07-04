import type { BorradorLocalTipo, BorradorSyncRequest } from '../services/borrador-local.service';
import { BorradorLocalService } from '../services/borrador-local.service';
import { ToastService } from '../services/toast.service';
import { esErrorSinConexion, mensajeApiError } from './api-error.util';

export function manejarErrorGuardadoConBorradorLocal(
  borradorLocal: BorradorLocalService,
  toast: ToastService,
  tipo: BorradorLocalTipo,
  clave: string,
  payload: unknown,
  err: unknown,
  opts?: {
    mensajeExitoLocal?: string;
    mensajeError?: string;
    onGuardadoLocal?: () => void;
    syncRequest?: BorradorSyncRequest;
  },
): boolean {
  if (esErrorSinConexion(err)) {
    borradorLocal.guardar(tipo, clave, payload, opts?.syncRequest);
    toast.exito(
      opts?.mensajeExitoLocal ??
        'Sin conexión: borrador guardado en este dispositivo. Restáuralo cuando vuelva internet.',
    );
    opts?.onGuardadoLocal?.();
    return true;
  }
  toast.error(mensajeApiError(err, opts?.mensajeError ?? 'No se pudo guardar.'));
  return false;
}

export function formatearFechaBorradorLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}
