import prisma from '../../prisma';
import { correoSmtpDisponible, enviarCorreo } from '../../utils/email/email.service';
import * as inventariosService from '../logistica/services/inventarios.service';

const TZ_CHILE = 'America/Santiago';
const DIAS_SIN_CHECKLIST = 7;

const enviadoHoy = new Set<string>();

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

async function enviarResumenDiario(): Promise<void> {
  if (yaEnviado('resumen-diario')) return;
  const config = await obtenerConfig();
  if (!config || config.resumenDiarioEmail !== 1) return;
  if (!correoSmtpDisponible()) return;

  const destinos = await destinatariosInstitucionales();
  if (!destinos.length) return;

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
    });
  }
  marcarEnviado('resumen-diario');
}

async function enviarRecordatoriosChecklist(): Promise<void> {
  if (yaEnviado('recordatorio-checklist')) return;
  const config = await obtenerConfig();
  if (!config || config.recordatoriosChecklist !== 1) return;
  if (!correoSmtpDisponible()) return;

  const destinos = await destinatariosInstitucionales();
  if (!destinos.length) return;

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
    return;
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
    await enviarCorreo({ to, subject: 'Recordatorio checklist · SIDEP', text: texto });
  }
  marcarEnviado('recordatorio-checklist');
}

async function enviarAlertasInventario(): Promise<void> {
  if (yaEnviado('alerta-inventario')) return;
  const config = await obtenerConfig();
  if (!config || config.alertasInventario !== 1) return;
  if (!correoSmtpDisponible()) return;

  const bajoMinimo = await inventariosService.listarMaterialesBajoMinimo();
  if (!bajoMinimo.length) {
    marcarEnviado('alerta-inventario');
    return;
  }

  const destinos = await destinatariosInstitucionales();
  if (!destinos.length) return;

  const lineas = bajoMinimo.map(
    (m) => `· ${m.nombre} (${m.codigo}): ${m.cantidad}/${m.stockMinimo} ${m.unidad ?? 'un'}`,
  );
  const texto = ['Alertas de inventario — SIDEP', '', 'Materiales bajo stock mínimo en bodega:', '', ...lineas, '', '— SIDEP'].join(
    '\n',
  );

  for (const to of destinos) {
    await enviarCorreo({ to, subject: 'Alerta inventario bodega · SIDEP', text: texto });
  }
  marcarEnviado('alerta-inventario');
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
    });
  }
}

async function ejecutarTareasProgramadas(): Promise<void> {
  const { hora, minuto } = horaChile();

  try {
    if (hora === 8 && minuto === 0) {
      await enviarResumenDiario();
    }
    if (hora === 7 && minuto === 0) {
      await enviarRecordatoriosChecklist();
    }
    if (hora === 9 && minuto === 0) {
      await enviarAlertasInventario();
    }
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
