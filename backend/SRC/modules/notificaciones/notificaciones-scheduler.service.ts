import prisma from '../../prisma';
import { correoSmtpDisponible, enviarCorreo } from '../../utils/email/email.service';
import { listarItemsAlertaStock } from '../logistica/services/inventario-items.service';

const TZ_CHILE = 'America/Santiago';
const DIAS_SIN_CHECKLIST = 7;

const enviadoHoy = new Set<string>();

export type TareaCronNotificaciones = 'auto' | 'resumen-diario' | 'checklist' | 'inventario' | 'todas';

function claveDia(tipo: string): string {
  const ahora = new Date();
  const fecha = ahora.toLocaleDateString('en-CA', { timeZone: TZ_CHILE });
  return `${tipo}:${fecha}`;
}

function yaEnviado(tipo: string): boolean {
  return enviadoHoy.has(claveDia(tipo));
}

function marcarEnviado(tipo: string): void {
  enviadoHoy.add(claveDia(tipo));
  if (enviadoHoy.size > 20) {
    enviadoHoy.clear();
    enviadoHoy.add(claveDia(tipo));
  }
}

function horaChile(): { hora: number; minuto: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ_CHILE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const hora = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minuto = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return { hora, minuto };
}

async function obtenerConfig() {
  return prisma.configuracionSistema.findUnique({ where: { id: 1 } });
}

async function destinatariosInstitucionales(): Promise<string[]> {
  const config = await obtenerConfig();
  const emails = new Set<string>();
  const institucional = config?.emailInstitucional?.trim();
  if (institucional) emails.add(institucional);

  const extra = (process.env.NOTIFICACIONES_EMAIL_EXTRA || '')
    .split(/[,;]/)
    .map((e) => e.trim())
    .filter(Boolean);
  for (const e of extra) emails.add(e);

  const admins = await prisma.usuario.findMany({
    where: { activo: 1, rol: { codigo: 'ADMIN' } },
    select: { email: true },
  });
  for (const u of admins) {
    if (u.email?.trim()) emails.add(u.email.trim());
  }
  return [...emails];
}

async function enviarResumenDiario(forzar = false): Promise<boolean> {
  if (!forzar && yaEnviado('resumen-diario')) return false;
  const config = await obtenerConfig();
  if (!config || config.resumenDiarioEmail !== 1) return false;
  if (!correoSmtpDisponible()) return false;

  const destinos = await destinatariosInstitucionales();
  if (!destinos.length) return false;

  const ahora = new Date();
  const ayerInicio = new Date(ahora);
  ayerInicio.setDate(ayerInicio.getDate() - 1);
  ayerInicio.setHours(0, 0, 0, 0);
  const ayerFin = new Date(ayerInicio);
  ayerFin.setHours(23, 59, 59, 999);

  const partes = await prisma.parteEmergencia.findMany({
    where: {
      fechaEmergencia: { gte: ayerInicio, lte: ayerFin },
      NOT: { estado: { codigo: 'ANULADO' } },
    },
    include: { clave: true, estado: true },
    orderBy: { fechaEmergencia: 'desc' },
  });

  const fechaLabel = ayerInicio.toLocaleDateString('es-CL', { timeZone: TZ_CHILE });
  const lineas = partes.map(
    (p) =>
      `· ${p.correlativo} — ${p.clave?.nombre ?? 'Sin clave'} — ${p.direccion?.slice(0, 80) ?? '—'}`,
  );
  const texto = [
    `Resumen diario SIDEP — ${fechaLabel}`,
    '',
    `Partes registrados: ${partes.length}`,
    '',
    ...(lineas.length ? lineas : ['Sin partes el día anterior.']),
    '',
    '— SIDEP',
  ].join('\n');

  for (const to of destinos) {
    await enviarCorreo({
      to,
      subject: `Resumen diario SIDEP · ${fechaLabel}`,
      text: texto,
      tipo: 'resumen-diario',
    });
  }
  marcarEnviado('resumen-diario');
  return true;
}

async function enviarRecordatoriosChecklist(forzar = false): Promise<boolean> {
  if (!forzar && yaEnviado('recordatorio-checklist')) return false;
  const config = await obtenerConfig();
  if (!config || config.recordatoriosChecklist !== 1) return false;
  if (!correoSmtpDisponible()) return false;

  const destinos = await destinatariosInstitucionales();
  if (!destinos.length) return false;

  const limite = new Date();
  limite.setDate(limite.getDate() - DIAS_SIN_CHECKLIST);

  const carros = await prisma.carro.findMany({
    where: { estadoOperativo: 1 },
    select: { id: true, nomenclatura: true, nombre: true },
  });

  const pendientes: string[] = [];
  for (const carro of carros) {
    const ultimo = await prisma.checklistEjecucion.findFirst({
      where: {
        entidadId: carro.id,
        entidadTipo: { in: ['CARRO', 'UNIDAD'] },
        estado: { not: 'BORRADOR' },
      },
      orderBy: { fechaRevision: 'desc' },
      select: { fechaRevision: true },
    });
    if (!ultimo || ultimo.fechaRevision < limite) {
      const dias = ultimo
        ? Math.floor((Date.now() - ultimo.fechaRevision.getTime()) / 86400000)
        : null;
      pendientes.push(
        `· ${carro.nomenclatura} (${carro.nombre}) — ${
          dias === null ? 'sin checklist registrado' : `${dias} días sin revisión`
        }`,
      );
    }
  }

  if (!pendientes.length) {
    marcarEnviado('recordatorio-checklist');
    return false;
  }

  const texto = [
    'Recordatorio de checklist — SIDEP',
    '',
    `Unidades con más de ${DIAS_SIN_CHECKLIST} días sin checklist completo:`,
    '',
    ...pendientes,
    '',
    '— SIDEP',
  ].join('\n');

  for (const to of destinos) {
    await enviarCorreo({
      to,
      subject: 'Recordatorio checklist · SIDEP',
      text: texto,
      tipo: 'recordatorio-checklist',
    });
  }
  marcarEnviado('recordatorio-checklist');
  return true;
}

async function enviarAlertasInventario(forzar = false): Promise<boolean> {
  if (!forzar && yaEnviado('alerta-inventario')) return false;
  const config = await obtenerConfig();
  if (!config || config.alertasInventario !== 1) return false;
  if (!correoSmtpDisponible()) return false;

  const alertas = await listarItemsAlertaStock();
  if (!alertas.length) {
    marcarEnviado('alerta-inventario');
    return false;
  }

  const destinos = await destinatariosInstitucionales();
  if (!destinos.length) return false;

  const lineas = alertas.map(
    (m) =>
      `· [${m.estadoStock}] ${m.nombre} (${m.codigo}) — ${m.bodega}: ${m.cantidadDisponible} disp. (mín. ${m.stockMinimo})`,
  );
  const texto = [
    'Alertas de inventario — SIDEP',
    '',
    'Ítems con stock bajo o crítico (inventario unificado):',
    '',
    ...lineas,
    '',
    '— SIDEP',
  ].join('\n');

  for (const to of destinos) {
    await enviarCorreo({
      to,
      subject: 'Alerta inventario · SIDEP',
      text: texto,
      tipo: 'alerta-inventario',
    });
  }
  marcarEnviado('alerta-inventario');
  return true;
}

export async function notificarNuevaEmergencia(parte: {
  correlativo: string;
  direccion?: string | null;
  claveEmergencia?: string | null;
}): Promise<void> {
  const config = await obtenerConfig();
  if (!config || config.alertasEmergencia !== 1) return;
  if (!correoSmtpDisponible()) return;

  const destinos = await destinatariosInstitucionales();
  if (!destinos.length) return;

  const texto = [
    'Nueva emergencia registrada en SIDEP',
    '',
    `Correlativo: ${parte.correlativo}`,
    `Clave: ${parte.claveEmergencia ?? '—'}`,
    `Dirección: ${parte.direccion ?? '—'}`,
    '',
    '— SIDEP',
  ].join('\n');

  for (const to of destinos) {
    await enviarCorreo({
      to,
      subject: `Nueva emergencia · ${parte.correlativo}`,
      text: texto,
      tipo: 'alerta-emergencia',
    });
  }
}

export async function notificarLicenciaResuelta(licenciaId: string): Promise<void> {
  if (!correoSmtpDisponible()) return;

  const lic = await prisma.licenciaMedica.findUnique({
    where: { id: licenciaId },
    include: {
      usuario: { include: { rol: true } },
      estado: true,
      resolutor: { include: { cargo: true, rol: true } },
    },
  });
  if (!lic?.usuario?.email?.trim()) return;

  const estado = lic.estado?.nombre?.toUpperCase() ?? '';
  if (!['APROBADA', 'RECHAZADA', 'ANULADA'].includes(estado)) return;

  const nombre = `${lic.usuario.nombres} ${lic.usuario.apellidoPaterno}`.trim();
  const resolutor = lic.resolutor
    ? `${lic.resolutor.nombres} ${lic.resolutor.apellidoPaterno}`.trim()
    : 'Oficialidad';
  const fechaInicio = lic.fechaInicio.toLocaleDateString('es-CL', { timeZone: TZ_CHILE });
  const fechaTermino = lic.fechaTermino.toLocaleDateString('es-CL', { timeZone: TZ_CHILE });
  const etiquetaEstado =
    estado === 'APROBADA' ? 'aprobada' : estado === 'RECHAZADA' ? 'rechazada' : 'anulada';

  const texto = [
    `Hola ${nombre},`,
    '',
    `Tu solicitud de licencia médica fue ${etiquetaEstado}.`,
    '',
    `Período: ${fechaInicio} – ${fechaTermino}`,
    `Resuelto por: ${resolutor}`,
    lic.observacionResolucion ? `Observación: ${lic.observacionResolucion}` : '',
    '',
    '— SIDEP',
  ]
    .filter(Boolean)
    .join('\n');

  await enviarCorreo({
    to: lic.usuario.email.trim(),
    subject: `Licencia ${etiquetaEstado} · SIDEP`,
    text: texto,
    tipo: 'licencia-resuelta',
  });
}

export async function ejecutarTareasCron(
  tarea: TareaCronNotificaciones = 'auto',
  forzar = false,
): Promise<{ ejecutadas: string[] }> {
  const { hora, minuto } = horaChile();
  const ejecutadas: string[] = [];

  const debeResumen =
    tarea === 'todas' || tarea === 'resumen-diario' || (tarea === 'auto' && hora === 8 && minuto === 0);
  const debeChecklist =
    tarea === 'todas' || tarea === 'checklist' || (tarea === 'auto' && hora === 7 && minuto === 0);
  const debeInventario =
    tarea === 'todas' || tarea === 'inventario' || (tarea === 'auto' && hora === 9 && minuto === 0);

  if (debeResumen && (await enviarResumenDiario(forzar))) ejecutadas.push('resumen-diario');
  if (debeChecklist && (await enviarRecordatoriosChecklist(forzar))) ejecutadas.push('checklist');
  if (debeInventario && (await enviarAlertasInventario(forzar))) ejecutadas.push('inventario');

  return { ejecutadas };
}

async function ejecutarTareasProgramadas(): Promise<void> {
  try {
    await ejecutarTareasCron('auto', false);
  } catch (err) {
    console.error('[SIDEP notificaciones]', err);
  }
}

let intervalo: ReturnType<typeof setInterval> | null = null;

export function iniciarSchedulerNotificaciones(): void {
  if (intervalo) return;
  void ejecutarTareasProgramadas();
  intervalo = setInterval(() => {
    void ejecutarTareasProgramadas();
  }, 60_000);
  console.log('[SIDEP] Scheduler de notificaciones activo (zona America/Santiago)');
}

export function detenerSchedulerNotificaciones(): void {
  if (intervalo) {
    clearInterval(intervalo);
    intervalo = null;
  }
}
