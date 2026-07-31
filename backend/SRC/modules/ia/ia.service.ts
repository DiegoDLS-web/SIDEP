import prisma from '../../prisma';
import { completarJson, completarTexto, iaDisponible } from './ia-llm.client';
import { obtenerCuarteleroEnTurno } from '../cuartel/services/asistencia-cuarteleros.service';
import { inferirSistemaTalla, inferirTipoEpp, validarTalla } from '../../utils/epp-tallas.util';
import { listarItemsAlertaStock } from '../logistica/services/inventario-items.service';

function primeraOracion(texto: string, max = 120): string {
  const t = texto.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const corte = t.split(/[.!?\n]/)[0] ?? t;
  return corte.slice(0, max).trim();
}

function parseFechaLocal(key: string): Date {
  return new Date(`${key}T12:00:00.000Z`);
}

/** Estado del módulo IA. */
export function estadoIa() {
  return {
    disponible: iaDisponible(),
    modelo: process.env.IA_MODEL?.trim() || 'gpt-4o-mini',
    proveedor: process.env.IA_BASE_URL?.includes('openai') || !process.env.IA_BASE_URL
      ? 'openai-compatible'
      : 'custom',
  };
}

// ─── Novedades ───────────────────────────────────────────────────────────────

export async function asistirNovedad(textoLibre: string) {
  const texto = textoLibre.trim();
  if (texto.length < 8) throw new Error('Escribe al menos unas líneas de la novedad.');

  const cuartelero = await obtenerCuarteleroEnTurno().catch(() => null);
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
  const turnos = await prisma.guardiaTurno.findMany({
    where: { fecha: parseFechaLocal(hoy) },
    include: { obac: true, cuartelero: true },
    take: 8,
  });

  const oficialSugerido =
    turnos.find((t) => t.obacRut)?.obacRut ||
    turnos.find((t) => t.cuarteleroRut)?.cuarteleroRut ||
    cuartelero?.usuarioRut ||
    null;

  const oficialNombre = turnos.find((t) => t.obacRut)?.obac
    ? `${turnos.find((t) => t.obacRut)!.obac!.nombres} ${turnos.find((t) => t.obacRut)!.obac!.apellidoPaterno}`
    : cuartelero?.usuario?.nombre || null;

  const grupoSugerido = turnos[0]?.grupo ?? null;

  if (iaDisponible()) {
    const llm = await completarJson<{
      titulo?: string;
      resumen?: string;
      avisarOficialidad?: boolean;
      motivoAviso?: string;
      grupoGuardia?: string | null;
    }>([
      {
        role: 'system',
        content:
          'Eres asistente del libro de novedades de un cuartel de bomberos chileno (SIDEP). Responde SOLO JSON: {titulo, resumen, avisarOficialidad:boolean, motivoAviso, grupoGuardia:"1"|"2"|"3"|"4"|null}. Título corto. Resumen claro en 2-4 oraciones.',
      },
      { role: 'user', content: texto },
    ]);
    if (llm.ok) {
      return {
        fuente: 'ia' as const,
        titulo: llm.data.titulo?.trim() || primeraOracion(texto, 80),
        resumen: llm.data.resumen?.trim() || texto.slice(0, 600),
        avisarOficialidad: Boolean(llm.data.avisarOficialidad),
        motivoAviso: llm.data.motivoAviso || null,
        grupoGuardia: llm.data.grupoGuardia || grupoSugerido,
        oficialACargoRutSugerido: oficialSugerido,
        oficialACargoNombreSugerido: oficialNombre,
        requiereConfirmacionHumana: true,
      };
    }
  }

  const urgencia = /incendio|fuga|robo|accidente|herido|peligro|falla\s+cr[ií]tica|sin\s+agua/i.test(texto);
  return {
    fuente: 'heuristica' as const,
    titulo: primeraOracion(texto, 80) || 'Novedad de cuartel',
    resumen: texto.slice(0, 800),
    avisarOficialidad: urgencia,
    motivoAviso: urgencia ? 'Se detectaron palabras de potencial urgencia operativa.' : null,
    grupoGuardia: grupoSugerido,
    oficialACargoRutSugerido: oficialSugerido,
    oficialACargoNombreSugerido: oficialNombre,
    requiereConfirmacionHumana: true,
  };
}

// ─── Partes ──────────────────────────────────────────────────────────────────

export async function normalizarDireccionParte(direccion: string, referencia?: string) {
  const raw = `${direccion} ${referencia ?? ''}`.trim();
  if (raw.length < 4) throw new Error('Indica una dirección.');

  if (iaDisponible()) {
    const llm = await completarJson<{
      direccionNormalizada?: string;
      sector?: string;
      comuna?: string;
      confianza?: number;
    }>([
      {
        role: 'system',
        content:
          'Normaliza direcciones de emergencias en Chile (foco Biobío / Santa Juana). JSON: {direccionNormalizada, sector, comuna, confianza:0-1}.',
      },
      { role: 'user', content: raw },
    ]);
    if (llm.ok) {
      return { fuente: 'ia' as const, ...llm.data, original: raw };
    }
  }

  const limpia = raw.replace(/\s+/g, ' ').trim();
  const sectorMatch = limpia.match(/\b(sector|pob\.|poblaci[oó]n|villa)\s+([^,]+)/i);
  return {
    fuente: 'heuristica' as const,
    direccionNormalizada: limpia,
    sector: sectorMatch?.[2]?.trim() || null,
    comuna: /santa\s*juana/i.test(limpia) ? 'Santa Juana' : null,
    confianza: 0.4,
    original: raw,
  };
}

export async function detectarInconsistenciasParte(payload: Record<string, unknown>) {
  const inconsistencias: Array<{ campo: string; mensaje: string; severidad: 'advertencia' | 'critico' }> = [];

  const unidades = Array.isArray(payload['unidades']) ? (payload['unidades'] as any[]) : [];
  const obac = String(payload['obacRut'] || payload['obacId'] || '').trim();
  if (!obac) {
    inconsistencias.push({ campo: 'obacRut', mensaje: 'Falta OBAC.', severidad: 'critico' });
  }

  for (let i = 0; i < unidades.length; i++) {
    const u = unidades[i] || {};
    if (!u.conductorRut && !u.conductor) {
      inconsistencias.push({
        campo: `unidades[${i}].conductor`,
        mensaje: `Unidad ${u.carroId ?? i + 1} sin conductor.`,
        severidad: 'advertencia',
      });
    }
    const kmS = Number(u.kmSalida);
    const kmL = Number(u.kmLlegada);
    if (Number.isFinite(kmS) && Number.isFinite(kmL) && kmL < kmS) {
      inconsistencias.push({
        campo: `unidades[${i}].km`,
        mensaje: `Km llegada (${kmL}) menor que km salida (${kmS}).`,
        severidad: 'critico',
      });
    }
    const hs = String(u.horaSalida || '');
    const hl = String(u.horaLlegada || '');
    if (hs && hl && hl < hs && !hl.startsWith('0') && hs.startsWith('2')) {
      // posible cruce de medianoche — no marcar
    } else if (hs && hl && hl < hs) {
      inconsistencias.push({
        campo: `unidades[${i}].horas`,
        mensaje: `Hora llegada (${hl}) anterior a salida (${hs}).`,
        severidad: 'advertencia',
      });
    }
  }

  if (iaDisponible() && Object.keys(payload).length > 2) {
    const llm = await completarJson<{
      inconsistencias?: Array<{ campo: string; mensaje: string; severidad?: string }>;
    }>([
      {
        role: 'system',
        content:
          'Auditas un parte de emergencia de bomberos. JSON: {inconsistencias:[{campo,mensaje,severidad:"advertencia"|"critico"}]}. Solo problemas reales.',
      },
      { role: 'user', content: JSON.stringify(payload).slice(0, 8000) },
    ]);
    if (llm.ok && Array.isArray(llm.data.inconsistencias)) {
      for (const x of llm.data.inconsistencias) {
        if (!x?.mensaje) continue;
        inconsistencias.push({
          campo: x.campo || 'general',
          mensaje: x.mensaje,
          severidad: x.severidad === 'critico' ? 'critico' : 'advertencia',
        });
      }
    }
  }

  return { fuente: iaDisponible() ? 'mixta' : 'heuristica', inconsistencias };
}

// ─── Checklist ───────────────────────────────────────────────────────────────

export async function analizarChecklistCriticos(payload: {
  unidad?: string;
  tipo?: string;
  itemsFallados?: Array<{ nombre: string; critico?: boolean; observacion?: string }>;
}) {
  const fallados = payload.itemsFallados ?? [];
  const criticos = fallados.filter((i) => i.critico !== false);

  const conteo = new Map<string, number>();
  for (const i of criticos) {
    const k = i.nombre.trim().toLowerCase();
    conteo.set(k, (conteo.get(k) ?? 0) + 1);
  }

  const repetidos = [...conteo.entries()]
    .filter(([, n]) => n > 1)
    .map(([nombre, veces]) => ({ nombre, veces }));

  let sugerencias: Array<{ item: string; causaProbable: string; accion: string }> = criticos.slice(0, 8).map((i) => {
    const n = i.nombre.toLowerCase();
    if (/manguera/.test(n)) {
      return { item: i.nombre, causaProbable: 'Desgaste o fuga', accion: 'Cambiar manguera / prueba de presión' };
    }
    if (/era|botella|aire/.test(n)) {
      return { item: i.nombre, causaProbable: 'Presión baja o vencimiento', accion: 'Revisar ERA y recargar' };
    }
    if (/extintor/.test(n)) {
      return { item: i.nombre, causaProbable: 'Carga o precinto', accion: 'Recargar / recertificar extintor' };
    }
    return {
      item: i.nombre,
      causaProbable: i.observacion || 'Falla reportada en checklist',
      accion: 'Reponer o reparar antes de declarar operativa',
    };
  });

  if (iaDisponible() && criticos.length) {
    const llm = await completarJson<{
      sugerencias?: Array<{ item: string; causaProbable: string; accion: string }>;
      resumen?: string;
    }>([
      {
        role: 'system',
        content:
          'Eres logística de bomberos. JSON: {sugerencias:[{item,causaProbable,accion}], resumen}. Acciones concretas y cortas.',
      },
      {
        role: 'user',
        content: JSON.stringify({ unidad: payload.unidad, tipo: payload.tipo, items: criticos }).slice(0, 6000),
      },
    ]);
    if (llm.ok && llm.data.sugerencias?.length) {
      sugerencias = llm.data.sugerencias;
      return {
        fuente: 'ia' as const,
        totalCriticos: criticos.length,
        repetidos,
        sugerencias,
        resumen: llm.data.resumen || `${criticos.length} ítem(s) crítico(s) en ${payload.unidad || 'unidad'}.`,
      };
    }
  }

  return {
    fuente: 'heuristica' as const,
    totalCriticos: criticos.length,
    repetidos,
    sugerencias,
    resumen: `${criticos.length} ítem(s) crítico(s) en ${payload.unidad || 'unidad'}.`,
  };
}

export async function resumenDiarioChecklists() {
  const desde = new Date();
  desde.setHours(0, 0, 0, 0);
  const checks = await prisma.checklistEjecucion.findMany({
    where: { fechaRevision: { gte: desde } },
    take: 200,
    orderBy: { fechaRevision: 'desc' },
  });

  const incompletos = checks.filter((c) => {
    const raw = c.respuestasJson || '';
    return /false|"ok"\s*:\s*false|faltante|"estado"\s*:\s*"malo"|critico/i.test(String(raw));
  });

  const porUnidad = new Map<string, number>();
  for (const c of incompletos) {
    const nom = `${c.entidadTipo}:${c.entidadId}`;
    porUnidad.set(nom, (porUnidad.get(nom) ?? 0) + 1);
  }

  const lineas = [...porUnidad.entries()].map(([u, n]) => `${u}: ${n} registro(s) con observaciones`);
  const resumenBase =
    porUnidad.size === 0
      ? 'Hoy no hay checklists con material crítico incompleto detectado.'
      : `${porUnidad.size} unidad(es) con material crítico incompleto. ${lineas.slice(0, 5).join('; ')}.`;

  if (iaDisponible() && porUnidad.size) {
    const llm = await completarTexto([
      {
        role: 'system',
        content: 'Redacta un resumen diario operativo de bomberos en español, 2-3 oraciones, tono claro.',
      },
      { role: 'user', content: resumenBase },
    ]);
    if (llm.ok) {
      return { fuente: 'ia' as const, resumen: llm.text, unidadesAfectadas: porUnidad.size, detalle: lineas };
    }
  }

  return {
    fuente: 'heuristica' as const,
    resumen: resumenBase,
    unidadesAfectadas: porUnidad.size,
    detalle: lineas,
  };
}

// ─── Inventario / EPP ────────────────────────────────────────────────────────

export async function clasificarEstadoDesdeFoto(descripcionOHint?: string) {
  // Sin visión multimodal obligatoria: usa descripción/hint; si hay IA, clasifica.
  const hint = (descripcionOHint || '').trim();
  if (iaDisponible() && hint) {
    const llm = await completarJson<{
      estado?: 'BUENO' | 'REGULAR' | 'MALO';
      confianza?: number;
      motivo?: string;
    }>([
      {
        role: 'system',
        content:
          'Clasifica estado de EPP/material de bomberos. JSON: {estado:"BUENO"|"REGULAR"|"MALO", confianza:0-1, motivo}.',
      },
      { role: 'user', content: hint.startsWith('data:image') ? 'Imagen adjunta (data URL truncada). Describe deterioro si aplica: ' + hint.slice(0, 200) : hint },
    ]);
    if (llm.ok && llm.data.estado) {
      return { fuente: 'ia' as const, ...llm.data };
    }
  }

  if (/roto|rasgad|inutil|vencid|sin\s+presi[oó]n|quema/i.test(hint)) {
    return { fuente: 'heuristica' as const, estado: 'MALO' as const, confianza: 0.55, motivo: 'Lenguaje de deterioro severo.' };
  }
  if (/desgast|manch|usado|regular|deterior/i.test(hint)) {
    return { fuente: 'heuristica' as const, estado: 'REGULAR' as const, confianza: 0.5, motivo: 'Señales de desgaste.' };
  }
  return { fuente: 'heuristica' as const, estado: 'BUENO' as const, confianza: 0.35, motivo: 'Sin indicios claros de falla.' };
}

export async function sugerirMovimientoInventario(descripcion: string) {
  const d = descripcion.trim();
  if (iaDisponible()) {
    const llm = await completarJson<{
      tipo?: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
      motivo?: string;
      cantidadSugerida?: number;
    }>([
      {
        role: 'system',
        content: 'Sugiere movimiento de inventario bomberos. JSON: {tipo:"ENTRADA"|"SALIDA"|"AJUSTE", motivo, cantidadSugerida}.',
      },
      { role: 'user', content: d },
    ]);
    if (llm.ok && llm.data.tipo) {
      return { fuente: 'ia' as const, ...llm.data, requiereConfirmacionHumana: true };
    }
  }

  let tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE' = 'AJUSTE';
  if (/compr|donaci|ingreso|lleg[oó]|reposici[oó]n/i.test(d)) tipo = 'ENTRADA';
  else if (/entrega|asign|consumo|uso|salida|pr[eé]stamo/i.test(d)) tipo = 'SALIDA';
  return {
    fuente: 'heuristica' as const,
    tipo,
    motivo: primeraOracion(d, 160),
    cantidadSugerida: 1,
    requiereConfirmacionHumana: true,
  };
}

export async function alertasInteligentesStock() {
  const base = await listarItemsAlertaStock().catch(() => []);
  const enriquecidas = base.slice(0, 30).map((a) => ({
    codigo: a.codigo,
    nombre: a.nombre,
    bodega: a.bodega,
    cantidadDisponible: a.cantidadDisponible,
    estadoStock: a.estadoStock,
    severidad: a.estadoStock === 'CRITICO' ? 'critico' : 'advertencia',
    titulo: `${a.nombre} (${a.codigo})`,
    detalle: `Disponible ${a.cantidadDisponible} · mín ${a.stockMinimo} · crítico ${a.stockCritico}`,
    prioridad: a.estadoStock === 'CRITICO' ? 1 : 2,
    consejo:
      a.estadoStock === 'CRITICO'
        ? 'Reponer de inmediato; bloquear asignación hasta stock mínimo.'
        : 'Programar compra/reposición esta semana.',
  }));

  if (iaDisponible() && enriquecidas.length) {
    const llm = await completarJson<{ orden?: string[]; resumen?: string }>([
      {
        role: 'system',
        content: 'Prioriza alertas de inventario. JSON: {orden:[codigos], resumen}.',
      },
      {
        role: 'user',
        content: JSON.stringify(
          enriquecidas.map((a) => ({ codigo: a.codigo, titulo: a.titulo, severidad: a.severidad })),
        ).slice(0, 5000),
      },
    ]);
    if (llm.ok) {
      return { fuente: 'ia' as const, alertas: enriquecidas, resumen: llm.data.resumen, orden: llm.data.orden };
    }
  }

  return {
    fuente: 'heuristica' as const,
    alertas: enriquecidas.sort((a, b) => a.prioridad - b.prioridad),
    resumen: `${enriquecidas.filter((a) => a.prioridad === 1).length} críticas, ${enriquecidas.length} totales.`,
  };
}

export function matchingTallaEpp(nombreArticulo: string, tallaUsuario?: string | null, categoria?: string | null) {
  const tipo = inferirTipoEpp(nombreArticulo, categoria);
  const sistema = inferirSistemaTalla(tipo);
  const error = validarTalla(sistema, tallaUsuario);
  return {
    fuente: 'regla' as const,
    tipoEpp: tipo,
    sistemaTalla: sistema,
    talla: tallaUsuario ?? null,
    ok: !error,
    mensaje: error || (sistema ? `Talla válida para sistema ${sistema}.` : 'Artículo sin sistema de talla detectable.'),
    sugerencia:
      sistema === 'BOTA'
        ? 'Usa talla 35–46.'
        : sistema === 'ROPA'
          ? 'Usa XS–XXL.'
          : 'Verifica si el ítem requiere talla.',
  };
}

// ─── Asistencia / cuartelero ─────────────────────────────────────────────────

export async function consultarAsistenciaNl(pregunta: string) {
  const q = pregunta.trim();
  if (q.length < 4) throw new Error('Escribe una pregunta.');

  const hoy = new Date();
  const hace14 = new Date(hoy);
  hace14.setDate(hace14.getDate() - 14);

  const registros = await prisma.asistenciaCuartelero.findMany({
    where: { fecha: { gte: hace14 } },
    include: { usuario: true },
    orderBy: { fecha: 'desc' },
    take: 400,
  });

  const guardias = await prisma.guardiaTurno.findMany({
    where: { fecha: { gte: hace14 } },
    include: { cuartelero: true },
    take: 100,
  });

  const contexto = {
    asistencias: registros.slice(0, 80).map((r) => ({
      fecha: r.fecha.toISOString().slice(0, 10),
      tipoTurno: r.tipoTurno,
      estado: r.estadoAsistencia,
      grupo: r.grupoGuardia,
      persona: `${r.usuario.nombres} ${r.usuario.apellidoPaterno}`,
      rut: r.usuarioRut,
      horaEntrada: r.horaEntrada,
      horaSalida: r.horaSalida,
    })),
    cuartelerosGuardia: guardias.slice(0, 40).map((g) => ({
      fecha: g.fecha.toISOString().slice(0, 10),
      grupo: g.grupo,
      tipoTurno: g.tipoTurno,
      cuartelero: g.cuartelero
        ? `${g.cuartelero.nombres} ${g.cuartelero.apellidoPaterno}`
        : null,
    })),
  };

  if (iaDisponible()) {
    const llm = await completarJson<{ respuesta?: string; hallazgos?: string[] }>([
      {
        role: 'system',
        content:
          'Respondes preguntas sobre asistencia/cuartel de bomberos. JSON: {respuesta, hallazgos:string[]}. Usa solo el contexto.',
      },
      { role: 'user', content: `Pregunta: ${q}\nContexto: ${JSON.stringify(contexto).slice(0, 12000)}` },
    ]);
    if (llm.ok) {
      return { fuente: 'ia' as const, respuesta: llm.data.respuesta || 'Sin respuesta.', hallazgos: llm.data.hallazgos || [] };
    }
  }

  const nocturna = /noche|nocturn/i.test(q);
  const sabado = /s[aá]bado/i.test(q);
  let filtrados = registros.filter((r) => r.estadoAsistencia === 'ASISTE' || r.estadoAsistencia === 'REEMPLAZA');
  if (nocturna) filtrados = filtrados.filter((r) => r.tipoTurno === 'NOCTURNA');
  if (sabado) {
    filtrados = filtrados.filter((r) => new Date(r.fecha).getUTCDay() === 6);
  }
  const nombres = [...new Set(filtrados.slice(0, 10).map((r) => `${r.usuario.nombres} ${r.usuario.apellidoPaterno}`))];
  return {
    fuente: 'heuristica' as const,
    respuesta:
      nombres.length > 0
        ? `Según registros recientes: ${nombres.join(', ')}.`
        : 'No encontré coincidencias claras en los últimos 14 días. Configura IA_API_KEY para mejor comprensión.',
    hallazgos: nombres,
  };
}

export async function detectarHuecosCobertura(desde?: string, hasta?: string) {
  const d = desde || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
  const h = hasta || d;
  const fechas: string[] = [];
  const cur = parseFechaLocal(d);
  const end = parseFechaLocal(h);
  while (cur <= end) {
    fechas.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  const [asistencias, guardias] = await Promise.all([
    prisma.asistenciaCuartelero.findMany({
      where: {
        fecha: { gte: parseFechaLocal(d), lte: parseFechaLocal(h) },
        estadoAsistencia: { in: ['ASISTE', 'REEMPLAZA', 'VACACIONES'] },
      },
      select: { fecha: true, tipoTurno: true, estadoAsistencia: true },
    }),
    prisma.guardiaTurno.findMany({
      where: {
        fecha: { gte: parseFechaLocal(d), lte: parseFechaLocal(h) },
        cuarteleroRut: { not: null },
      },
      select: { fecha: true },
    }),
  ]);

  const asistePorCelda = new Set<string>();
  const vacacionesPorFecha = new Set<string>();
  for (const a of asistencias) {
    const fecha = a.fecha.toISOString().slice(0, 10);
    if (a.estadoAsistencia === 'VACACIONES') {
      vacacionesPorFecha.add(fecha);
    } else {
      asistePorCelda.add(`${fecha}|${a.tipoTurno}`);
    }
  }
  const guardiaPorFecha = new Set(guardias.map((g) => g.fecha.toISOString().slice(0, 10)));

  const huecos: Array<{ fecha: string; tipoTurno: string; motivo: string }> = [];
  for (const fecha of fechas) {
    for (const tipoTurno of ['DIURNA', 'NOCTURNA'] as const) {
      if (asistePorCelda.has(`${fecha}|${tipoTurno}`) || guardiaPorFecha.has(fecha)) continue;
      huecos.push({
        fecha,
        tipoTurno,
        motivo: vacacionesPorFecha.has(fecha)
          ? 'Solo vacaciones registradas; sin cuartelero de turno.'
          : 'Sin cuartelero ni asistencia ASISTE.',
      });
    }
  }

  return { fuente: 'regla' as const, desde: d, hasta: h, huecos, total: huecos.length };
}

export async function resumenSemanalFaltas(grupo?: string) {
  const hoy = new Date();
  const desde = new Date(hoy);
  desde.setDate(desde.getDate() - 7);
  const where: any = {
    fecha: { gte: desde },
    estadoAsistencia: { in: ['NO_ASISTE', 'LIBERADO', 'VACACIONES'] },
  };
  if (grupo) where.grupoGuardia = grupo;

  const rows = await prisma.asistenciaCuartelero.findMany({
    where,
    include: { usuario: true },
  });

  const porGrupo = new Map<string, number>();
  const porPersona = new Map<string, number>();
  for (const r of rows) {
    const g = r.grupoGuardia || 'S/G';
    porGrupo.set(g, (porGrupo.get(g) ?? 0) + 1);
    const nom = `${r.usuario.nombres} ${r.usuario.apellidoPaterno}`;
    porPersona.set(nom, (porPersona.get(nom) ?? 0) + 1);
  }

  const topGrupos = [...porGrupo.entries()].sort((a, b) => b[1] - a[1]);
  const topPersonas = [...porPersona.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  let resumen = `Últimos 7 días: ${rows.length} registros de falta/liberado/vacaciones. `;
  if (topGrupos[0]) resumen += `Grupo con más marcas: ${topGrupos[0][0]} (${topGrupos[0][1]}).`;

  if (iaDisponible()) {
    const llm = await completarTexto([
      { role: 'system', content: 'Resume faltas de asistencia de bomberos en 2 oraciones.' },
      { role: 'user', content: JSON.stringify({ topGrupos, topPersonas, total: rows.length }) },
    ]);
    if (llm.ok) resumen = llm.text;
  }

  return {
    fuente: iaDisponible() ? 'mixta' : 'heuristica',
    resumen,
    porGrupo: Object.fromEntries(topGrupos),
    topPersonas: topPersonas.map(([nombre, faltas]) => ({ nombre, faltas })),
  };
}

// ─── Analítica ───────────────────────────────────────────────────────────────

export async function chatAnalitica(pregunta: string, anio?: number, mes?: number) {
  const y = anio || new Date().getFullYear();
  const m = mes || new Date().getMonth() + 1;
  const inicio = new Date(Date.UTC(y, m - 1, 1));
  const fin = new Date(Date.UTC(y, m, 0, 23, 59, 59));
  const prevInicio = new Date(Date.UTC(m === 1 ? y - 1 : y, m === 1 ? 11 : m - 2, 1));
  const prevFin = new Date(Date.UTC(m === 1 ? y - 1 : y, m === 1 ? 12 : m - 1, 0, 23, 59, 59));

  const [total, totalPrev] = await Promise.all([
    prisma.parteEmergencia.count({
      where: { fechaEmergencia: { gte: inicio, lte: fin }, NOT: { estado: { codigo: 'ANULADO' } } },
    }),
    prisma.parteEmergencia.count({
      where: { fechaEmergencia: { gte: prevInicio, lte: prevFin }, NOT: { estado: { codigo: 'ANULADO' } } },
    }),
  ]);

  const contexto = {
    anio: y,
    mes: m,
    emergenciasMes: total,
    emergenciasMesAnterior: totalPrev,
    delta: total - totalPrev,
  };

  if (iaDisponible()) {
    const llm = await completarJson<{
      respuesta?: string;
      recomendaciones?: string[];
      explicacionHeatmap?: string;
    }>([
      {
        role: 'system',
        content:
          'Analista operacional SIDEP bomberos. JSON: {respuesta, recomendaciones:string[], explicacionHeatmap}. Sé concreto.',
      },
      { role: 'user', content: `Pregunta: ${pregunta}\nDatos: ${JSON.stringify(contexto)}` },
    ]);
    if (llm.ok) {
      return { fuente: 'ia' as const, ...contexto, ...llm.data };
    }
  }

  const resp =
    totalPrev > 0 && /baj[oó]|subi[oó]|compar|tiempo|respuesta|enero|mes/i.test(pregunta)
      ? `En ${m}/${y} hubo ${total} emergencias vs ${totalPrev} del mes anterior (Δ ${total - totalPrev}).`
      : `En ${m}/${y} se registraron ${total} emergencias (mes anterior: ${totalPrev}).`;

  return {
    fuente: 'heuristica' as const,
    ...contexto,
    respuesta: resp,
    recomendaciones: [
      total > totalPrev ? 'Revisar sectores con más salidas esta semana.' : 'Mantener cobertura actual de grupos.',
      'Cruzar con asistencia de cuartelero los días de mayor demanda.',
    ],
    explicacionHeatmap: 'Los picos suelen concentrarse fines de semana; refuerza grupo con más faltas.',
  };
}

// ─── Licencias ───────────────────────────────────────────────────────────────

export async function extraerLicenciaDesdeTexto(textoPdfOcr: string) {
  const texto = textoPdfOcr.trim();
  if (texto.length < 10) throw new Error('No hay texto suficiente del adjunto.');

  if (iaDisponible()) {
    const llm = await completarJson<{
      fechaInicio?: string;
      fechaTermino?: string;
      dias?: number;
      diagnosticoGenerico?: string;
      tipoReposo?: string;
    }>([
      {
        role: 'system',
        content:
          'Extraes datos de licencia médica chilena. JSON: {fechaInicio:YYYY-MM-DD, fechaTermino:YYYY-MM-DD, dias, diagnosticoGenerico, tipoReposo}. Sin datos clínicos sensibles detallados.',
      },
      { role: 'user', content: texto.slice(0, 10000) },
    ]);
    if (llm.ok) {
      return { fuente: 'ia' as const, ...llm.data, requiereConfirmacionHumana: true };
    }
  }

  const fechas = [...texto.matchAll(/\b(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})\b/g)].map((m) => {
    return `${m[3]}-${m[2]}-${m[1]}`;
  });
  const diasMatch = texto.match(/\b(\d{1,3})\s*d[ií]as?\b/i);
  return {
    fuente: 'heuristica' as const,
    fechaInicio: fechas[0] || null,
    fechaTermino: fechas[1] || fechas[0] || null,
    dias: diasMatch ? Number(diasMatch[1]) : null,
    diagnosticoGenerico: 'Reposo médico (revisar adjunto)',
    tipoReposo: null,
    requiereConfirmacionHumana: true,
  };
}

export async function alertarSolapeLicenciaCuartel(usuarioRut: string, fechaInicio: string, fechaTermino: string) {
  const lic = await prisma.licenciaMedica.findMany({
    where: {
      usuarioRut,
      OR: [
        {
          fechaInicio: { lte: parseFechaLocal(fechaTermino) },
          fechaTermino: { gte: parseFechaLocal(fechaInicio) },
        },
      ],
    },
    take: 20,
  });

  const turnos = await prisma.guardiaTurno.findMany({
    where: {
      cuarteleroRut: usuarioRut,
      fecha: { gte: parseFechaLocal(fechaInicio), lte: parseFechaLocal(fechaTermino) },
    },
    take: 50,
  });

  const asistencias = await prisma.asistenciaCuartelero.findMany({
    where: {
      usuarioRut,
      fecha: { gte: parseFechaLocal(fechaInicio), lte: parseFechaLocal(fechaTermino) },
      estadoAsistencia: { in: ['ASISTE', 'REEMPLAZA'] },
    },
    take: 50,
  });

  return {
    fuente: 'regla' as const,
    haySolapeLicencias: lic.length > 1,
    turnosCuartelEnPeriodo: turnos.length,
    asistenciasAsisteEnPeriodo: asistencias.length,
    alerta: turnos.length > 0 || asistencias.length > 0,
    mensaje:
      turnos.length || asistencias.length
        ? `La persona tiene ${turnos.length} turno(s) como cuartelero y ${asistencias.length} asistencia(s) ASISTE en el período de licencia.`
        : 'No se detectó solape con turnos/asistencia de cuartel en el período.',
    detalleTurnos: turnos.map((t) => ({ id: t.id, fecha: t.fecha.toISOString().slice(0, 10), grupo: t.grupo })),
  };
}

// ─── Notificaciones ──────────────────────────────────────────────────────────

export async function priorizarYRedactarNotificaciones(
  alertas: Array<{ tipo?: string; severidad?: string; titulo: string; detalle?: string }>,
) {
  const criticas = alertas.filter((a) => a.severidad === 'critico');
  const otras = alertas.filter((a) => a.severidad !== 'critico');

  const agrupadas = new Map<string, typeof alertas>();
  for (const a of alertas) {
    const k = a.tipo || a.titulo.slice(0, 40);
    const arr = agrupadas.get(k) || [];
    arr.push(a);
    agrupadas.set(k, arr);
  }

  let resumen = `Prioridad: ${criticas.length} crítica(s), ${otras.length} advertencia(s). `;
  resumen += [...agrupadas.entries()]
    .slice(0, 5)
    .map(([k, v]) => `${k}×${v.length}`)
    .join('; ');

  if (iaDisponible()) {
    const llm = await completarTexto([
      {
        role: 'system',
        content: 'Redacta resumen diario de alertas SIDEP en español claro, máximo 4 oraciones. Agrupa ruido.',
      },
      { role: 'user', content: JSON.stringify(alertas.slice(0, 40)) },
    ]);
    if (llm.ok) resumen = llm.text;
  }

  return {
    fuente: iaDisponible() ? 'mixta' : 'heuristica',
    ordenadas: [...criticas, ...otras],
    grupos: Object.fromEntries([...agrupadas.entries()].map(([k, v]) => [k, v.length])),
    resumenDiario: resumen,
    spamEvitado: alertas.length - Math.min(alertas.length, [...agrupadas.keys()].length),
  };
}
