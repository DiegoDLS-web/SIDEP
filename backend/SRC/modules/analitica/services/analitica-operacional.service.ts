import prisma from '../../../prisma';
import { parteWhereNoAnulado } from '../../operaciones/partes-where';
import { getDashboardResumen } from './dashboard.service';

export const getAnaliticaOperacionalReporte = async (anioParam?: number, mesParam?: number) => {
  const anio = anioParam || new Date().getFullYear();
  const mes = mesParam || (new Date().getMonth() + 1);

  // Month ranges
  const inicioMes = new Date(Date.UTC(anio, mes - 1, 1, 0, 0, 0));
  const finMes = new Date(Date.UTC(anio, mes, 0, 23, 59, 59, 999));
  const diasMes = new Date(anio, mes, 0).getDate();

  // Previous month ranges
  let anioAnterior = anio;
  let mesAnterior = mes - 1;
  if (mesAnterior === 0) {
    mesAnterior = 12;
    anioAnterior = anio - 1;
  }
  const inicioMesAnt = new Date(Date.UTC(anioAnterior, mesAnterior - 1, 1, 0, 0, 0));
  const finMesAnt = new Date(Date.UTC(anioAnterior, mesAnterior, 0, 23, 59, 59, 999));

  // 1. Fetch units in emergencies for current month
  const unidadesMes = await prisma.unidadEnEmergencia.findMany({
    where: {
      parte: parteWhereNoAnulado({
        fechaEmergencia: { gte: inicioMes, lte: finMes },
      }),
    },
    include: {
      carro: true,
      parte: true,
    },
  });

  // 2. Fetch units in emergencies for previous month (for comparative)
  const unidadesMesAnt = await prisma.unidadEnEmergencia.findMany({
    where: {
      parte: parteWhereNoAnulado({
        fechaEmergencia: { gte: inicioMesAnt, lte: finMesAnt },
      }),
    },
  });

  // Calculate KPIs
  let totalDespachoMs = 0;
  let totalRespuestaMs = 0;
  let validDespachoCount = 0;
  let validRespuestaCount = 0;
  let respuestaBajo8Min = 0;
  let salidasTotalesMes = unidadesMes.length;
  let kilometrosTotalesMes = 0;

  for (const u of unidadesMes) {
    const kmDiff = Number(u.kmLlegada) - Number(u.kmSalida);
    if (kmDiff > 0) {
      kilometrosTotalesMes += kmDiff;
    }

    // Despacho: horaSalida - parte.fechaEmergencia
    if (u.horaSalida && u.parte?.fechaEmergencia) {
      const diff = u.horaSalida.getTime() - u.parte.fechaEmergencia.getTime();
      if (diff >= 0) {
        totalDespachoMs += diff;
        validDespachoCount++;
      }
    }

    // Respuesta: horaLlegada - horaSalida
    if (u.horaLlegada && u.horaSalida) {
      const diff = u.horaLlegada.getTime() - u.horaSalida.getTime();
      if (diff >= 0) {
        totalRespuestaMs += diff;
        validRespuestaCount++;
        const diffMin = diff / (1000 * 60);
        if (diffMin <= 8) {
          respuestaBajo8Min++;
        }
      }
    }
  }

  const tiempoDespachoPromedioMin = validDespachoCount > 0
    ? Math.round(totalDespachoMs / (validDespachoCount * 1000 * 60))
    : 0;
  const tiempoRespuestaPromedioMin = validRespuestaCount > 0
    ? Math.round(totalRespuestaMs / (validRespuestaCount * 1000 * 60))
    : 0;
  const cumplimientoRespuesta8MinPct = validRespuestaCount > 0
    ? Math.round((respuestaBajo8Min / validRespuestaCount) * 100)
    : 0;
  const duracionPromedioEmergenciaMin = 0;

  // Previous month calculations for comparative
  let kilometrosMesAnterior = 0;
  let salidasMesAnterior = unidadesMesAnt.length;
  for (const u of unidadesMesAnt) {
    const kmDiff = Number(u.kmLlegada) - Number(u.kmSalida);
    if (kmDiff > 0) {
      kilometrosMesAnterior += kmDiff;
    }
  }

  const variacionSalidasPct = salidasMesAnterior > 0 ? Math.round(((salidasTotalesMes - salidasMesAnterior) / salidasMesAnterior) * 100) : 0;
  const variacionKilometrosPct = kilometrosMesAnterior > 0 ? Math.round(((kilometrosTotalesMes - kilometrosMesAnterior) / kilometrosMesAnterior) * 100) : 0;

  // Sectores Críticos (group by direction/sector)
  const sectorMap: Record<string, { totalMs: number; count: number }> = {};
  for (const u of unidadesMes) {
    if (u.parte?.direccion && u.horaLlegada && u.horaSalida) {
      const sector = u.parte.direccion.split(',')[0] || 'Centro';
      const diff = u.horaLlegada.getTime() - u.horaSalida.getTime();
      if (diff >= 0) {
        if (!sectorMap[sector]) {
          sectorMap[sector] = { totalMs: 0, count: 0 };
        }
        sectorMap[sector].totalMs += diff;
        sectorMap[sector].count++;
      }
    }
  }

  const sectoresCriticos = Object.entries(sectorMap).map(([sector, data]) => ({
    sector,
    promedioRespuestaMin: Math.round(data.totalMs / (data.count * 1000 * 60)),
    casos: data.count,
  })).sort((a, b) => b.promedioRespuestaMin - a.promedioRespuestaMin).slice(0, 5);

  // Uso de Unidades
  const carros = await prisma.carro.findMany();
  const usoUnidades = carros.map((c) => {
    const salidasUnidad = unidadesMes.filter((u) => u.carroId === c.id);
    const salidas = salidasUnidad.length;
    let km = 0;
    for (const u of salidasUnidad) {
      const kmDiff = Number(u.kmLlegada) - Number(u.kmSalida);
      if (kmDiff > 0) {
        km += kmDiff;
      }
    }

    const cleanCarId = c.id.replace(/[^0-9]/g, '');
    const id = parseInt(cleanCarId, 10) || 0;

    return {
      id,
      nomenclatura: c.nomenclatura,
      salidas,
      km,
      kilometrosPromedioPorSalida: salidas > 0 ? Math.round(km / salidas) : 0,
    };
  });

  // Cumplimiento Checklist
  const checklistEjecuciones = await prisma.checklistEjecucion.findMany({
    where: {
      fechaRevision: { gte: inicioMes, lte: finMes },
      estado: 'COMPLETADO',
    },
  });

  const cumplimientoChecklist = carros.map((c) => {
    const ejecucionesCarro = checklistEjecuciones.filter((e) => e.entidadId === c.id);
    const diasConChecklist = new Set(ejecucionesCarro.map((e) => e.fechaRevision.toISOString().split('T')[0])).size;
    const cumplimientoPct = Math.round((diasConChecklist / diasMes) * 100);

    const cleanCarId = c.id.replace(/[^0-9]/g, '');
    const carroId = parseInt(cleanCarId, 10) || 0;

    return {
      carroId,
      nomenclatura: c.nomenclatura,
      diasConChecklist,
      diasMes,
      cumplimientoPct,
    };
  });

  // Salidas por semana
  const semanasMes = Math.ceil(diasMes / 7);
  const salidasPorSemana = Array.from({ length: semanasMes }, (_, i) => {
    const startDay = i * 7 + 1;
    const endDay = Math.min((i + 1) * 7, diasMes);
    const start = new Date(Date.UTC(anio, mes - 1, startDay, 0, 0, 0));
    const end = new Date(Date.UTC(anio, mes - 1, endDay, 23, 59, 59, 999));

    const salidas = unidadesMes.filter((u) => {
      const date = u.parte?.fechaEmergencia;
      return date && date >= start && date <= end;
    }).length;

    return {
      semana: i + 1,
      salidas,
    };
  });

  // Asistencia Voluntarios Por Mes (yearly list)
  const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const inicioAnio = new Date(Date.UTC(anio, 0, 1, 0, 0, 0));
  const finAnio = new Date(Date.UTC(anio, 11, 31, 23, 59, 59, 999));

  const asistenciasAnio = await prisma.asistenciaPersonal.findMany({
    where: {
      parte: parteWhereNoAnulado({
        fechaEmergencia: { gte: inicioAnio, lte: finAnio },
      }),
    },
    include: {
      parte: true,
      usuario: {
        include: { rol: true, cargo: true },
      },
    },
  });

  // Complemento: partes con asistencia solo en metadata (registros anteriores al sync relacional)
  const partesConMetaAsistencia = await prisma.parteEmergencia.findMany({
    where: parteWhereNoAnulado({
      fechaEmergencia: { gte: inicioAnio, lte: finAnio },
      metadata: { not: null },
    }),
    select: { id: true, fechaEmergencia: true, metadata: true },
  });

  type AsistenciaVirtual = {
    parteId: string;
    usuarioRut: string;
    parte: { fechaEmergencia: Date };
    usuario: { nombres: string; apellidoPaterno: string | null; apellidoMaterno: string | null; rol: { nombre: string } | null; cargo: { nombre: string } | null } | null;
  };

  const virtuales: AsistenciaVirtual[] = [];
  const rutsConFila = new Set(asistenciasAnio.map((a) => `${a.parteId}:${a.usuarioRut}`));

  for (const parte of partesConMetaAsistencia) {
    let meta: Record<string, unknown> | null = null;
    try {
      meta = parte.metadata ? JSON.parse(parte.metadata) as Record<string, unknown> : null;
    } catch {
      meta = null;
    }
    const apc = (meta?.asistencia as Record<string, unknown> | undefined)?.asistenciaPorContexto as
      | Record<string, Record<string, boolean>>
      | undefined;
    if (!apc) continue;

    for (const ctx of Object.values(apc)) {
      for (const [id, mark] of Object.entries(ctx || {})) {
        if (!mark || !id.startsWith('usr-')) continue;
        const rut = id.slice(4).trim();
        if (!rut || rutsConFila.has(`${parte.id}:${rut}`)) continue;
        rutsConFila.add(`${parte.id}:${rut}`);
        const usuario = await prisma.usuario.findUnique({
          where: { rut },
          include: { rol: true, cargo: true },
        });
        virtuales.push({
          parteId: parte.id,
          usuarioRut: rut,
          parte: { fechaEmergencia: parte.fechaEmergencia },
          usuario: usuario
            ? {
                nombres: usuario.nombres,
                apellidoPaterno: usuario.apellidoPaterno,
                apellidoMaterno: usuario.apellidoMaterno,
                rol: usuario.rol,
                cargo: usuario.cargo,
              }
            : null,
        });
      }
    }
  }

  const asistenciasCombinadas = [
    ...asistenciasAnio,
    ...virtuales.map((v) => ({
      id: `meta-${v.parteId}-${v.usuarioRut}`,
      parteId: v.parteId,
      usuarioRut: v.usuarioRut,
      parte: v.parte,
      usuario: v.usuario,
    })),
  ];

  const asistenciaVoluntariosPorMes = Array.from({ length: 12 }, (_, i) => {
    const asistenciasMes = asistenciasCombinadas.filter((a) => a.parte?.fechaEmergencia.getMonth() === i);
    const voluntariosConAsistencia = new Set(asistenciasMes.map((a) => a.usuarioRut)).size;

    return {
      mes: i + 1,
      nombreMes: mesesNombres[i] || '',
      voluntariosConAsistencia,
      asistenciasRegistradas: asistenciasMes.length,
    };
  });

  const asistenciaVoluntariosTotalAnual = asistenciasCombinadas.length;

  // Partes del mes por clave (10-0, 10-1, etc.)
  const partesMes = await prisma.parteEmergencia.findMany({
    where: parteWhereNoAnulado({
      fechaEmergencia: { gte: inicioMes, lte: finMes },
    }),
    include: { clave: true },
  });

  const claveGroups: Record<string, number> = {};
  for (const p of partesMes) {
    let codigo = p.clave?.codigo || 'SIN_CLAVE';
    if (p.metadata) {
      try {
        const meta = JSON.parse(p.metadata) as Record<string, unknown>;
        const mc = typeof meta['claveEmergencia'] === 'string' ? meta['claveEmergencia'].trim() : '';
        if (mc) codigo = mc;
      } catch {
        /* ignore */
      }
    }
    claveGroups[codigo] = (claveGroups[codigo] || 0) + 1;
  }

  const partesPorClave = Object.entries(claveGroups)
    .map(([claveEmergencia, cantidad]) => ({ claveEmergencia, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const totalPartesMes = partesMes.length;

  // Asistencia Voluntarios Detalle Por Mes
  const asistenciaVoluntariosDetallePorMes = Array.from({ length: 12 }, (_, i) => {
    const asistenciasMes = asistenciasCombinadas.filter((a) => a.parte?.fechaEmergencia.getMonth() === i);
    const userMap: Record<string, { nombre: string; rol: string; cargo: string | null; count: number; partes: Set<string> }> = {};

    for (const a of asistenciasMes) {
      if (!userMap[a.usuarioRut]) {
        userMap[a.usuarioRut] = {
          nombre: `${a.usuario?.nombres} ${a.usuario?.apellidoPaterno} ${a.usuario?.apellidoMaterno}`.trim(),
          rol: a.usuario?.rol?.nombre || 'USER',
          cargo: a.usuario?.cargo?.nombre || null,
          count: 0,
          partes: new Set(),
        };
      }
      const entry = userMap[a.usuarioRut];
      if (entry) {
        entry.count++;
        entry.partes.add(a.parteId);
      }
    }

    const voluntarios = Object.entries(userMap)
      .filter(([, data]) => {
        if ((data.rol ?? '').trim().toUpperCase() === 'ADMIN') return false;
        const nom = (data.nombre ?? '').toLowerCase();
        return !nom.includes('admin de pruebas') && !nom.includes('admin pruebas');
      })
      .map(([rut, data]) => {
      const cleanRut = rut.replace(/[^0-9]/g, '');
      const usuarioId = parseInt(cleanRut, 10) || 0;

      return {
        usuarioId,
        nombre: data.nombre,
        rol: data.rol,
        cargo: data.cargo,
        asistenciasRegistradas: data.count,
        partesConAsistencia: data.partes.size,
      };
    });

    return {
      mes: i + 1,
      nombreMes: mesesNombres[i] || '',
      voluntarios,
    };
  });

  const resumenDashboard = await getDashboardResumen(anio, 'todos', undefined);

  return {
    anio,
    mes,
    tiempoDespachoPromedioMin,
    tiempoRespuestaPromedioMin,
    duracionPromedioEmergenciaMin,
    cumplimientoRespuesta8MinPct,
    salidasTotalesMes,
    kilometrosTotalesMes,
    sectoresCriticos,
    usoUnidades,
    cumplimientoChecklist,
    comparativoMensual: {
      salidasMesAnterior,
      kilometrosMesAnterior,
      variacionSalidasPct,
      variacionKilometrosPct,
    },
    salidasPorSemana,
    asistenciaVoluntariosPorMes,
    asistenciaVoluntariosTotalAnual,
    asistenciaVoluntariosDetallePorMes,
    totalPartesMes,
    partesPorClave,
    resumenDashboard: {
      anio: resumenDashboard.anio,
      totalEmergencias: resumenDashboard.totalEmergencias,
      tiempoPromedioRespuestaMin: resumenDashboard.tiempoPromedioRespuestaMin,
      porcentajeResueltas: resumenDashboard.porcentajeResueltas,
      emergenciasEsteMes: resumenDashboard.emergenciasEsteMes,
      porMes: resumenDashboard.porMes,
      porTipo: resumenDashboard.porTipo,
      heatmapSemanas: resumenDashboard.heatmapSemanas,
    },
  };
};
