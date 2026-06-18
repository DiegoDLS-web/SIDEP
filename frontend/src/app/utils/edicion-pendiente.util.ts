export type ControlEdicionPendiente = {
  marcarLimpio(): void;
  tieneCambios(): boolean;
};

/** Compara un snapshot JSON del estado del formulario para detectar cambios sin guardar. */
export function crearControlEdicionPendiente<T>(obtenerEstado: () => T): ControlEdicionPendiente {
  let snapshot = '';
  return {
    marcarLimpio() {
      snapshot = JSON.stringify(obtenerEstado());
    },
    tieneCambios() {
      if (!snapshot) return false;
      return JSON.stringify(obtenerEstado()) !== snapshot;
    },
  };
}
