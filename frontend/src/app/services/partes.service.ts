import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import type {
  CarroBasicoDto,
  ParteEmergenciaDto,
  ParteMetadataDto,
  PacienteParteDto,
  UnidadParteDto,
  UsuarioBasicoDto,
} from '../models/parte.dto';

export type CrearPartePayload = {
  claveEmergencia: string;
  direccion: string;
  obacId: number;
  fecha?: string;
  estado?: string;
  /** Permite crear parte sin datos completos (backend relaja validación). */
  borrador?: boolean;
  unidades: Array<{
    carroId: number;
    horaSalida: string;
    horaLlegada: string;
    hora6_0: string;
    hora6_3: string;
    hora6_9: string;
    hora6_10: string;
    kmSalida: number;
    kmLlegada: number;
  }>;
  pacientes?: Array<{ nombre: string; triage: string; edad?: number; rut?: string }>;
  metadata?: ParteMetadataDto;
};

export type ActualizarPartePayload = Partial<
  Omit<CrearPartePayload, 'borrador'>
>;

export type PartesPaginaResp = {
  items: ParteEmergenciaDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PartesMetricasResp = {
  totalSistema: number;
  enAnioActual: number;
  enMesActual: number;
};

@Injectable({ providedIn: 'root' })
export class PartesService {
  private readonly http = inject(HttpClient);
  private nextDemoParteId = 9000;
  private readonly carrosBasicoDemo: CarroBasicoDto[] = [
    { id: 1, nomenclatura: 'B-1', patente: 'BBSJ-01' },
    { id: 2, nomenclatura: 'BX-1', patente: 'BXSJ-01' },
    { id: 3, nomenclatura: 'R-1', patente: 'RESJ-01' },
  ];
  private readonly obacBasicoDemo: UsuarioBasicoDto[] = [
    { id: 1, nombre: 'Capitán Demo', rut: '11.111.111-1', rol: 'CAPITAN' },
    { id: 2, nombre: 'Teniente Demo', rut: '22.222.222-2', rol: 'TENIENTE' },
    { id: 3, nombre: 'Voluntario Demo', rut: '33.333.333-3', rol: 'VOLUNTARIOS' },
  ];
  private readonly demoPartes: ParteEmergenciaDto[] = [
    {
      id: 1,
      correlativo: '2026-047',
      claveEmergencia: '10-0-1',
      direccion: 'Av. Independencia 342',
      fecha: new Date().toISOString(),
      estado: 'COMPLETADO',
      obacId: 1,
      obac: { id: 1, nombre: 'Modo Demo Local', rut: '00.000.000-0', rol: 'ADMIN' },
      unidades: [
        {
          id: 1,
          parteId: 1,
          carroId: 1,
          horaSalida: '14:23',
          horaLlegada: '14:27',
          hora6_0: '14:23',
          hora6_3: '14:25',
          hora6_9: '14:26',
          hora6_10: '14:27',
          kmSalida: 12450,
          kmLlegada: 12468,
          carro: { id: 1, nomenclatura: 'B-1', patente: 'BBSJ-01' },
        },
      ],
      pacientes: [{ id: 1, parteId: 1, nombre: 'Paciente demo', triage: 'VERDE', edad: null, rut: null }],
      metadata: {
        descripcionEmergencia: 'Humo en segundo piso.',
        trabajoRealizado: 'Ataque inicial con línea de 38 mm.',
      },
    },
    {
      id: 2,
      correlativo: '2026-046',
      claveEmergencia: '10-4-1',
      direccion: 'Ruta 5 Sur km 412',
      fecha: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      estado: 'PENDIENTE',
      obacId: 1,
      obac: { id: 1, nombre: 'Modo Demo Local', rut: '00.000.000-0', rol: 'ADMIN' },
      unidades: [
        {
          id: 2,
          parteId: 2,
          carroId: 3,
          horaSalida: '09:15',
          horaLlegada: '09:40',
          hora6_0: '09:15',
          hora6_3: '09:30',
          hora6_9: '09:35',
          hora6_10: '09:40',
          kmSalida: 67890,
          kmLlegada: 67920,
          carro: { id: 3, nomenclatura: 'R-1', patente: 'RESJ-01' },
        },
      ],
      pacientes: [],
    },
    {
      id: 3,
      correlativo: '2026-045',
      claveEmergencia: '10-2-1',
      direccion: 'Camino Los Boldos s/n',
      fecha: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      estado: 'COMPLETADO',
      obacId: 1,
      obac: { id: 1, nombre: 'Modo Demo Local', rut: '00.000.000-0', rol: 'ADMIN' },
      unidades: [
        {
          id: 3,
          parteId: 3,
          carroId: 2,
          horaSalida: '16:00',
          horaLlegada: '16:45',
          hora6_0: '16:00',
          hora6_3: '16:20',
          hora6_9: '16:30',
          hora6_10: '16:45',
          kmSalida: 45200,
          kmLlegada: 45235,
          carro: { id: 2, nomenclatura: 'BX-1', patente: 'BXSJ-01' },
        },
      ],
      pacientes: [],
    },
  ];

  listar(): Observable<ParteEmergenciaDto[]> {
    return this.http.get<ParteEmergenciaDto[]>('/api/partes').pipe(catchError(() => of(this.demoPartes)));
  }

  /** Listado paginado con filtros (servidor). */
  listarPagina(opts: {
    page: number;
    pageSize: number;
    tipo?: string;
    q?: string;
    desde?: string;
    hasta?: string;
  }): Observable<PartesPaginaResp> {
    let p = new HttpParams().set('page', String(opts.page)).set('pageSize', String(opts.pageSize));
    if (opts.tipo) {
      p = p.set('tipo', opts.tipo);
    }
    if (opts.q) {
      p = p.set('q', opts.q);
    }
    if (opts.desde) {
      p = p.set('desde', opts.desde);
    }
    if (opts.hasta) {
      p = p.set('hasta', opts.hasta);
    }
    return this.http.get<PartesPaginaResp>('/api/partes/pagina', { params: p }).pipe(
      catchError(() => of(this.demoPagina(opts))),
    );
  }

  /** Totales globales para tarjetas del listado de partes. */
  metricas(): Observable<PartesMetricasResp> {
    return this.http.get<PartesMetricasResp>('/api/partes/metricas').pipe(catchError(() => of(this.demoMetricas())));
  }

  private demoPagina(opts: {
    page: number;
    pageSize: number;
    tipo?: string;
    q?: string;
    desde?: string;
    hasta?: string;
  }): PartesPaginaResp {
    let rows = [...this.demoPartes];
    if (opts.tipo) {
      rows = rows.filter((p) => p.claveEmergencia === opts.tipo);
    }
    if (opts.q) {
      const qq = opts.q.toLowerCase();
      rows = rows.filter((p) => p.direccion.toLowerCase().includes(qq));
    }
    if (opts.desde) {
      const d0 = new Date(opts.desde).getTime();
      rows = rows.filter((p) => new Date(p.fecha).getTime() >= d0);
    }
    if (opts.hasta) {
      const d1 = new Date(opts.hasta).getTime();
      rows = rows.filter((p) => new Date(p.fecha).getTime() <= d1);
    }
    const total = rows.length;
    const i = (opts.page - 1) * opts.pageSize;
    const items = rows.slice(i, i + opts.pageSize);
    const totalPages = Math.max(1, Math.ceil(total / opts.pageSize));
    return { items, total, page: opts.page, pageSize: opts.pageSize, totalPages };
  }

  private demoMetricas(): PartesMetricasResp {
    const y = new Date().getFullYear();
    const m = new Date().getMonth();
    return {
      totalSistema: this.demoPartes.length,
      enAnioActual: this.demoPartes.filter((p) => new Date(p.fecha).getFullYear() === y).length,
      enMesActual: this.demoPartes.filter((p) => {
        const d = new Date(p.fecha);
        return d.getFullYear() === y && d.getMonth() === m;
      }).length,
    };
  }

  obtener(id: number): Observable<ParteEmergenciaDto> {
    return this.http.get<ParteEmergenciaDto>(`/api/partes/${id}`).pipe(
      catchError(() => {
        const parte = this.demoPartes.find((p) => p.id === id) ?? this.demoPartes[0]!;
        return of(parte);
      }),
    );
  }

  crear(payload: CrearPartePayload): Observable<ParteEmergenciaDto> {
    return this.http.post<ParteEmergenciaDto>('/api/partes', payload).pipe(
      catchError(() => of(this.simularCrearParteLocal(payload))),
    );
  }

  private resolverCarroBasico(carroId: number): CarroBasicoDto {
    return (
      this.carrosBasicoDemo.find((c) => c.id === carroId) ?? {
        id: carroId,
        nomenclatura: `U-${carroId}`,
        patente: '—',
      }
    );
  }

  private resolverObacBasico(obacId: number): UsuarioBasicoDto {
    return (
      this.obacBasicoDemo.find((u) => u.id === obacId) ?? {
        id: obacId,
        nombre: 'OBAC (demo)',
        rut: '00.000.000-0',
        rol: 'ADMIN',
      }
    );
  }

  /** Persistencia solo en memoria: lista y detalle muestran el parte hasta recargar la app. */
  private simularCrearParteLocal(payload: CrearPartePayload): ParteEmergenciaDto {
    const id = this.nextDemoParteId++;
    const correlativo = `DEMO-${id}`;
    const fecha = payload.fecha ?? new Date().toISOString();
    const obac = this.resolverObacBasico(payload.obacId);
    const unidades: UnidadParteDto[] = (payload.unidades ?? []).map((u, idx) => ({
      id: id * 100 + idx + 1,
      parteId: id,
      carroId: u.carroId,
      horaSalida: u.horaSalida,
      horaLlegada: u.horaLlegada,
      hora6_0: u.hora6_0,
      hora6_3: u.hora6_3,
      hora6_9: u.hora6_9,
      hora6_10: u.hora6_10,
      kmSalida: u.kmSalida,
      kmLlegada: u.kmLlegada,
      carro: this.resolverCarroBasico(u.carroId),
    }));
    const pacientes: PacienteParteDto[] = (payload.pacientes ?? []).map((p, idx) => ({
      id: id * 10 + idx + 1,
      parteId: id,
      nombre: p.nombre,
      triage: p.triage,
      edad: p.edad ?? null,
      rut: p.rut ?? null,
    }));
    const dto: ParteEmergenciaDto = {
      id,
      correlativo,
      claveEmergencia: payload.claveEmergencia,
      direccion: payload.direccion,
      fecha,
      estado: payload.estado ?? 'PENDIENTE',
      metadata: payload.metadata,
      obacId: payload.obacId,
      obac,
      unidades,
      pacientes,
    };
    this.demoPartes.unshift(dto);
    return dto;
  }

  actualizar(id: number, payload: ActualizarPartePayload): Observable<ParteEmergenciaDto> {
    return this.http.patch<ParteEmergenciaDto>(`/api/partes/${id}`, payload);
  }
}
