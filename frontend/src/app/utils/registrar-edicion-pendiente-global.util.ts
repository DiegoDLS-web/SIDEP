import { DestroyRef, inject } from '@angular/core';
import { EdicionPendienteRegistryService } from '../services/edicion-pendiente-registry.service';

/** Enlaza un componente al aviso nativo beforeunload mientras tenga edición pendiente. */
export function registrarEdicionPendienteGlobal(destroyRef: DestroyRef, tienePendiente: () => boolean): void {
  const registry = inject(EdicionPendienteRegistryService);
  const unregister = registry.registrar(tienePendiente);
  destroyRef.onDestroy(unregister);
}
