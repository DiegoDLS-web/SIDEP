import { CommonModule, formatDate } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { catchError, of } from 'rxjs';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { ASISTENCIA_CONTEXTO_OPCIONES, resolverEtiquetaAsistenciaId } from './asistencia-roster.constants';
import { CatalogoTiposEmergenciaService } from '../../services/catalogo-tipos-emergencia.service';
import { UsuariosService } from '../../services/usuarios.service';
import { nombreListaSoloPersona } from '../usuarios/usuario-registro.constants';

/**
 * Bloque de presentación solo lectura del parte (reutilizado en modal del historial).
 */
@Component({
  selector: 'app-parte-vista-solo-lectura',
  standalone: true,
  imports: [CommonModule, SidepIconsModule],
  templateUrl: './parte-vista-solo-lectura.component.html',
})
export class ParteVistaSoloLecturaComponent implements OnInit {
  @Input({ required: true }) parte!: any;

  private readonly catalogoEmergencias = inject(CatalogoTiposEmergenciaService);
  private readonly usuariosApi = inject(UsuariosService);
  private nombresPorRut: Record<string, string> = {};

  ngOnInit(): void {
    this.usuariosApi.selectorObac().pipe(catchError(() => of([]))).subscribe((usuarios) => {
      for (const u of usuarios) {
        this.nombresPorRut[u.id] = nombreListaSoloPersona(u);
        if (u.rut) this.nombresPorRut[u.rut] = nombreListaSoloPersona(u);
      }
    });
  }

  etiquetaClave(clave: string): string {
    return this.catalogoEmergencias.etiqueta(clave);
  }

  textoMotivoPendiente(parte: any): string | null {
    if ((parte?.estado ?? '').trim().toUpperCase() !== 'PENDIENTE') return null;
    const meta = parte?.metadata ?? {};
    const motivo =
      (typeof parte?.motivoPendiente === 'string' ? parte.motivoPendiente : null) ??
      (typeof meta.motivoPendiente === 'string' ? meta.motivoPendiente : null);
    return motivo?.trim() || 'Pendiente de cierre o datos incompletos.';
  }

  etiquetaCarroUnidad(u: { carro?: { nomenclatura?: string; patente?: string } | null; carroId?: string }): string {
    return u.carro?.nomenclatura ?? u.carroId ?? '—';
  }
  readonly asistenciaContextos = ASISTENCIA_CONTEXTO_OPCIONES;

  readonly etiquetasAsistencia: Array<{ k: string; label: string; }> = [
    { k: 'comandoIncidenteCi', label: 'Comando incidente — C. I (nombre o clave)' },
    { k: 'comandoIncidenteJs', label: 'Comando incidente — J. S (nombre o clave)' },
    { k: 'comandoIncidenteJo', label: 'Comando incidente — J. O (nombre o clave)' },
    { k: 'detalleComandoIncidente', label: 'Comando incidente (texto único, legado)' },
    { k: 'otraCompaniaNombre', label: 'Otra compañía — nombre' },
    { k: 'otraCompaniaNombreCompania', label: 'Otra compañía — compañía' },
    { k: 'otraCompaniaUnidad', label: 'Otra compañía — unidad' },
    { k: 'asistenciaTotal', label: 'Asistencia total (voluntarios)' },
    { k: 'oficial128', label: 'Oficial 12-8' },
  ];

  idDisplay(correlativo: string): string {
    return `P-${correlativo}`;
  }

  fechaHora(fechaIso: string): string {
    const d = new Date(fechaIso);
    if (Number.isNaN(d.getTime())) {
      return '—';
    }
    return `${formatDate(d, 'dd/MM/yyyy HH:mm', 'es-CL')}`;
  }

  estadoClase(estado: string): string {
    const e = (estado || '').toUpperCase();
    if (e === 'COMPLETADO') {
      return 'bg-green-600/20 text-green-400';
    }
    if (e === 'PENDIENTE') {
      return 'bg-yellow-600/20 text-yellow-400';
    }
    if (e === 'BORRADOR') {
      return 'bg-slate-600/30 text-slate-300';
    }
    return 'bg-gray-600/20 text-gray-300';
  }

  triageClase(t: string): string {
    switch (t) {
      case 'ROJO':
        return 'text-red-400';
      case 'AMARILLO':
        return 'text-yellow-400';
      case 'VERDE':
        return 'text-green-400';
      default:
        return 'text-gray-300';
    }
  }

  tieneDetalleExtendido(m: any): boolean {
    if (!m) return false;
    return !!(
      m.descripcionEmergencia?.trim() ||
      m.trabajoRealizado?.trim() ||
      m.horaDelLlamado?.trim() ||
      m.horaLlamadoCodigo?.trim() ||
      m.materialUtilizado?.trim() ||
      m.observaciones?.trim() ||
      this.asistenciaTieneDatos(m.asistencia) ||
      (m.conductoresPorCarroId && Object.keys(m.conductoresPorCarroId).length > 0) ||
      (m.vehiculos && m.vehiculos.length > 0) ||
      (m.apoyoExterno && m.apoyoExterno.length > 0)
    );
  }

  asistenciaTieneDatos(a: any): boolean {
    if (!a) {
      return false;
    }
    const sel = a.asistenciaSeleccion;
    if (sel && typeof sel === 'object' && Object.values(sel).some(Boolean)) {
      return true;
    }
    const apc = a.asistenciaPorContexto;
    if (apc && typeof apc === 'object') {
      for (const v of Object.values(apc)) {
        if (v && typeof v === 'object' && Object.values(v).some(Boolean)) {
          return true;
        }
      }
    }
    if (a.radiosSeleccion && Object.values(a.radiosSeleccion).some(Boolean)) {
      return true;
    }
    if (a.radiosDetalle && Object.values(a.radiosDetalle).some((v: any) => typeof v === 'string' && v.trim().length > 0)) {
      return true;
    }
    if (a.firmaEncargadoDatos?.startsWith('data:image') || a.firmaObac?.startsWith('data:image')) {
      return true;
    }
    const keysTexto: string[] = [
      'detalleComandoIncidente',
      'comandoIncidenteCi',
      'comandoIncidenteJs',
      'comandoIncidenteJo',
      'otraCompaniaNombre',
      'otraCompaniaNombreCompania',
      'otraCompaniaUnidad',
      'asistenciaTotal',
      'oficial128',
      'radiosUtilizadas',
      'encargadoDatos',
      'nombreObac',
    ];
    for (const k of keysTexto) {
      const v = a[k];
      if (typeof v === 'string' && v.trim().length > 0) {
        return true;
      }
    }
    return false;
  }

  radiosAsistenciaLista(a: any): string[] {
    if (!a?.radiosSeleccion) {
      return [];
    }
    return Object.entries(a.radiosSeleccion)
      .filter(([, v]) => v)
      .map(([k]) => k);
  }

  nombresAsistenciaMarcados(sel: any): string[] {
    if (!sel) {
      return [];
    }
    return Object.entries(sel)
      .filter(([, v]) => v)
      .map(([id]) => resolverEtiquetaAsistenciaId(id, this.nombresPorRut));
  }

  nombresAsistenciaContexto(a: any, ctx: string): string[] {
    return this.nombresAsistenciaMarcados(a?.asistenciaPorContexto?.[ctx]);
  }

  usaAsistenciaPorContexto(a: any): boolean {
    const apc = a?.asistenciaPorContexto;
    if (!apc) {
      return false;
    }
    return Object.values(apc).some((rec: any) => rec && Object.values(rec).some(Boolean));
  }

  entradasConductores(rec: any): [string, string][] {
    if (!rec) {
      return [];
    }
    return Object.entries(rec);
  }

  conductorUnidad(metadata: any, carroId: number | string): string {
    const m = metadata?.conductoresPorCarroId;
    if (!m) {
      return '—';
    }
    const v = m[String(carroId)]?.trim();
    return v || '—';
  }

  horaDelLlamadoDisplay(parte: any): string {
    return parte.metadata?.horaDelLlamado?.trim() || '—';
  }

  etiquetaConductorUnidad(parte: any, carroId: string, conductor: string): string {
    const unidad = (parte.unidades ?? []).find((u: any) => String(u.carroId) === String(carroId));
    const etiqueta = unidad?.carro?.nomenclatura ?? unidad?.carro?.nombre ?? 'Unidad';
    return `${etiqueta}: ${conductor}`;
  }

  lineaApoyo(a: any): string {
    const tipo = this.etiquetaTipoApoyo(a.tipo);
    const partes = [tipo];
    const pat = a.patente?.trim();
    const cond = a.conductor?.trim() || a.nombre?.trim();
    if (pat) partes.push(`Patente: ${pat}`);
    if (cond) partes.push(`Conductor: ${cond}`);
    return partes.join('   ');
  }

  private etiquetaTipoApoyo(tipo: string): string {
    const map: Record<string, string> = {
      SAMU: 'SAMU',
      CARABINEROS: 'Carabineros',
      SEGURIDAD_CIUDADANA: 'Seguridad Ciudadana',
      OTRO: 'Otro',
    };
    return map[(tipo || '').toUpperCase()] ?? (tipo || 'Apoyo externo');
  }
}