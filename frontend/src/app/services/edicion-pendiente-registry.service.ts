import { Injectable } from '@angular/core';

/** Registro global para avisar al cerrar pestaña (beforeunload) cuando hay formularios sucios. */
@Injectable({ providedIn: 'root' })
export class EdicionPendienteRegistryService {
  private readonly proveedores = new Set<() => boolean>();

  registrar(proveedor: () => boolean): () => void {
    this.proveedores.add(proveedor);
    return () => this.proveedores.delete(proveedor);
  }

  hayAlgunoPendiente(): boolean {
    for (const proveedor of this.proveedores) {
      if (proveedor()) return true;
    }
    return false;
  }
}
