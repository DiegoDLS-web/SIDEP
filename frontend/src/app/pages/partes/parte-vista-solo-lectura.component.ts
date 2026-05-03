import { CommonModule, formatDate } from '@angular/common';
import { Component, Input } from '@angular/core';
import type { ParteAsistenciaMetadata, ParteEmergenciaDto, ParteMetadataDto } from '../../models/parte.dto';
import type { AsistenciaContextoKey } from '../../models/parte.dto';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { ASISTENCIA_CONTEXTO_OPCIONES, ASISTENCIA_ITEM_LABELS } from './asistencia-roster.constants';
import { etiquetaClave } from './partes.constants';

/**
 * Bloque de presentación solo lectura del parte (reutilizado en modal del historial).
 */
@Component({
  selector: 'app-parte-vista-solo-lectura',
  standalone: true,
  imports: [CommonModule, SidepIconsModule],
  templateUrl: './parte-vista-solo-lectura.component.html',
})
export class ParteVistaSoloLecturaComponent {
  @Input({ required: true }) parte!: ParteEmergenciaDto;

  readonly etiquetaClave = etiquetaClave;
  readonly asistenciaContextos = ASISTENCIA_CONTEXTO_OPCIONES;

  readonly etiquetasAsistencia: Array<{
    k:
      | 'detalleComandoIncidente'
      | 'comandoIncidenteCi'
      | 'comandoIncidenteJs'
      | 'comandoIncidenteJo'
      | 'otraCompaniaNombre'
      | 'otraCompaniaNombreCompania'
      | 'otraCompaniaUnidad'
      | 'asistenciaTotal'
      | 'oficial128';
    label: string;
  }> = [
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
    const e = estado.toUpperCase();
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

  tieneDetalleExtendido(m: ParteMetadataDto): boolean {
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

  asistenciaTieneDatos(a: ParteAsistenciaMetadata | undefined): boolean {
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
    if (a.radiosDetalle && Object.values(a.radiosDetalle).some((v) => typeof v === 'string' && v.trim().length > 0)) {
      return true;
    }
    if (a.firmaEncargadoDatos?.startsWith('data:image') || a.firmaObac?.startsWith('data:image')) {
      return true;
    }
    const keysTexto: (keyof ParteAsistenciaMetadata)[] = [
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

  radiosAsistenciaLista(a: ParteAsistenciaMetadata | undefined): string[] {
    if (!a?.radiosSeleccion) {
      return [];
    }
    return Object.entries(a.radiosSeleccion)
      .filter(([, v]) => v)
      .map(([k]) => k);
  }

  nombresAsistenciaMarcados(sel: Record<string, boolean> | undefined): string[] {
    if (!sel) {
      return [];
    }
    return Object.entries(sel)
      .filter(([, v]) => v)
      .map(([id]) => ASISTENCIA_ITEM_LABELS[id] ?? id);
  }

  nombresAsistenciaContexto(
    a: ParteAsistenciaMetadata | undefined,
    ctx: AsistenciaContextoKey,
  ): string[] {
    return this.nombresAsistenciaMarcados(a?.asistenciaPorContexto?.[ctx]);
  }

  usaAsistenciaPorContexto(a: ParteAsistenciaMetadata | undefined): boolean {
    const apc = a?.asistenciaPorContexto;
    if (!apc) {
      return false;
    }
    return Object.values(apc).some((rec) => rec && Object.values(rec).some(Boolean));
  }

  entradasConductores(rec: Record<string, string> | undefined): [string, string][] {
    if (!rec) {
      return [];
    }
    return Object.entries(rec);
  }

  conductorUnidad(metadata: ParteMetadataDto | null | undefined, carroId: number): string {
    const m = metadata?.conductoresPorCarroId;
    if (!m) {
      return '—';
    }
    const v = m[String(carroId)]?.trim();
    return v || '—';
  }

  horaDelLlamadoDisplay(parte: ParteEmergenciaDto): string {
    return parte.metadata?.horaDelLlamado?.trim() || '—';
  }

  lineaApoyo(
    a: NonNullable<ParteMetadataDto['apoyoExterno']>[number],
  ): string {
    const base = `${a.tipo} — ${a.nombre} (${a.cargo})`;
    const pat = a.patente?.trim();
    const cond = a.conductor?.trim();
    const leg = 'movil' in a && typeof (a as { movil?: string }).movil === 'string' ? (a as { movil?: string }).movil?.trim() : '';
    const parts = [base];
    if (pat) {
      parts.push(`Pat. ${pat}`);
    } else if (leg) {
      parts.push(leg);
    }
    if (cond) {
      parts.push(`Cond. ${cond}`);
    }
    return parts.join(' · ');
  }
}
