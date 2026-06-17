export type EstadoValidacion = 'ok' | 'alerta' | 'error';

export interface AuditoriaItemDto {
  id: string;
  usuarioRut: string | null;
  usuarioNombre: string | null;
  accion: string;
  entidad: string | null;
  entidadId: string | null;
  metodoHttp: string | null;
  ruta: string | null;
  ipOrigen: string | null;
  detalle: string | null;
  resultado: string;
  createdAt: string;
}

export interface AuditoriaPaginaDto {
  items: AuditoriaItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuditoriaFiltrosDto {
  page?: number;
  pageSize?: number;
  rut?: string;
  accion?: string;
  entidad?: string;
  desde?: string;
  hasta?: string;
}

export interface AuditoriaHallazgoDto {
  id: string;
  modulo: string;
  entidad: string;
  campo: string;
  mensaje: string;
  severidad: EstadoValidacion;
  valor?: string | null;
}

export interface AuditoriaMetricasDto {
  formulariosCompletosPct: number;
  erroresDetectados: number;
  alertasDetectadas: number;
  registrosRevisados: number;
  servidorOperativo: boolean;
  ultimaRevision: string;
}

export interface AuditoriaChecklistFilaDto {
  unidad: string;
  nombre: string;
  tipo: 'unidad' | 'era' | 'trauma';
  fecha: string | null;
  totalItems: number | null;
  itemsOk: number | null;
  completo: boolean;
  pctCompletitud: number;
  estado: EstadoValidacion;
  observaciones: string[];
}

export interface AuditoriaUsuarioFilaDto {
  rut: string;
  nombre: string;
  rol: string;
  email: string | null;
  telefono: string | null;
  activo: boolean;
  camposVacios: string[];
  estado: EstadoValidacion;
}
