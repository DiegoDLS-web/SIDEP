/** Fila de auditoría al guardar mantención / inspección (coincide con Prisma `CarroRegistroHistorial`). */
export interface CarroRegistroHistorialDto {
  id: number;
  carroId: number;
  creadoEn: string;
  ultimoMantenimiento: string | null;
  proximoMantenimiento: string | null;
  proximaRevisionTecnica: string | null;
  ultimaRevisionBombaAgua: string | null;
  descripcionUltimoMantenimiento: string | null;
  ultimoInspector: string | null;
  firmaUltimoInspector: string | null;
  fechaUltimaInspeccion: string | null;
  ultimoConductor: string | null;
}

/** Respuesta de `GET /api/carros/historial-general` (registro + unidad). */
export interface CarroHistorialGeneralFila extends CarroRegistroHistorialDto {
  carro: { id: number; nomenclatura: string; nombre: string | null; patente: string | null };
}
