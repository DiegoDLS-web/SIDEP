"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportesRouter = void 0;
const express_1 = require("express");
const prisma_js_1 = require("../lib/prisma.js");
exports.reportesRouter = (0, express_1.Router)();
function esTipoExcluidoAsistencia(tipo) {
    const t = String(tipo ?? '')
        .trim()
        .toUpperCase();
    return t === 'CADETE' || t === 'ASPIRANTE';
}
function esUsuarioDemo(nombre, email, rut) {
    const n = String(nombre ?? '')
        .trim()
        .toUpperCase();
    const e = String(email ?? '')
        .trim()
        .toUpperCase();
    const r = String(rut ?? '')
        .trim()
        .toUpperCase();
    return (n.includes('DEMO') ||
        n.includes('PRUEBA') ||
        n.includes('TEST') ||
        e.includes('DEMO') ||
        e.includes('PRUEBA') ||
        e.includes('TEST') ||
        r === '99.999.999-9');
}
function wherePartesSinDemo(fecha) {
    return {
        fecha,
        NOT: [
            { direccion: { contains: 'demo', mode: 'insensitive' } },
            { direccion: { contains: 'prueba', mode: 'insensitive' } },
            { correlativo: { startsWith: 'PRB-' } },
        ],
    };
}
function parseHoraEnFecha(base, hhmm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
    if (!m)
        return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm))
        return null;
    const d = new Date(base);
    d.setHours(hh, mm, 0, 0);
    return d;
}
function diffMin(inicio, fin) {
    if (!inicio || !fin)
        return null;
    const diff = (fin.getTime() - inicio.getTime()) / 60000;
    if (!Number.isFinite(diff) || diff < 0 || diff > 24 * 60)
        return null;
    return diff;
}
function extraerSector(direccion) {
    const raw = String(direccion || '').trim();
    if (!raw)
        return 'Sin sector';
    const sector = raw.split(',')[0]?.trim() ?? '';
    return sector || 'Sin sector';
}
function extraerAsistenciasMetadata(metadata) {
    const meta = metadata;
    const apc = meta?.asistencia?.asistenciaPorContexto;
    if (!apc || typeof apc !== 'object')
        return [];
    const out = [];
    for (const mapa of Object.values(apc)) {
        if (!mapa || typeof mapa !== 'object')
            continue;
        for (const [k, v] of Object.entries(mapa)) {
            if (!k.startsWith('usr-'))
                continue;
            const uid = Number(k.slice(4));
            if (!Number.isFinite(uid) || uid <= 0)
                continue;
            out.push({ usuarioId: uid, presente: Boolean(v) });
        }
    }
    return out;
}
exports.reportesRouter.get('/emergencias', async (req, res) => {
    const desde = req.query.desde ? new Date(String(req.query.desde)) : undefined;
    const hasta = req.query.hasta ? new Date(String(req.query.hasta)) : undefined;
    if (desde && Number.isNaN(desde.getTime())) {
        res.status(400).json({ error: 'desde inválido' });
        return;
    }
    if (hasta && Number.isNaN(hasta.getTime())) {
        res.status(400).json({ error: 'hasta inválido' });
        return;
    }
    try {
        const partes = await prisma_js_1.prisma.parteEmergencia.findMany({
            where: {
                ...(desde || hasta
                    ? {
                        fecha: {
                            ...(desde ? { gte: desde } : {}),
                            ...(hasta ? { lte: hasta } : {}),
                        },
                    }
                    : {}),
            },
            include: {
                unidades: true,
            },
            orderBy: { fecha: 'desc' },
        });
        const total = partes.length;
        const completadas = partes.filter((p) => p.estado.toUpperCase() === 'COMPLETADO').length;
        const tiempos = partes
            .map((p) => {
            const salida = p.unidades[0]?.horaSalida;
            if (!salida)
                return null;
            const fechaSalida = parseHoraEnFecha(p.fecha, salida);
            if (!fechaSalida)
                return null;
            const diffMin = (fechaSalida.getTime() - p.fecha.getTime()) / 60000;
            return diffMin >= 0 && diffMin < 360 ? diffMin : null;
        })
            .filter((x) => x !== null);
        const tiempoPromedio = tiempos.length ? Number((tiempos.reduce((a, b) => a + b, 0) / tiempos.length).toFixed(2)) : 0;
        const porMesMap = new Map();
        for (const p of partes) {
            const d = new Date(p.fecha);
            const key = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}`;
            porMesMap.set(key, (porMesMap.get(key) ?? 0) + 1);
        }
        const porMes = Array.from(porMesMap.entries())
            .sort(([a], [b]) => (a < b ? -1 : 1))
            .map(([periodo, cantidad]) => ({ periodo, cantidad }));
        res.json({
            totalEmergencias: total,
            porcentajeResueltas: total ? Number(((completadas / total) * 100).toFixed(2)) : 0,
            tiempoPromedioRespuestaMin: tiempoPromedio,
            porMes,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'No se pudo generar reporte de emergencias' });
    }
});
exports.reportesRouter.get('/analitica-operacional', async (req, res) => {
    const hoy = new Date();
    const anio = Number(req.query.anio) || hoy.getFullYear();
    const mes = Number(req.query.mes) || hoy.getMonth() + 1;
    if (!Number.isFinite(anio) || !Number.isFinite(mes) || mes < 1 || mes > 12) {
        res.status(400).json({ error: 'anio/mes inválidos' });
        return;
    }
    const inicio = new Date(anio, mes - 1, 1, 0, 0, 0, 0);
    const fin = new Date(anio, mes, 0, 23, 59, 59, 999);
    const diasMes = new Date(anio, mes, 0).getDate();
    const inicioMesAnterior = new Date(anio, mes - 2, 1, 0, 0, 0, 0);
    const finMesAnterior = new Date(anio, mes - 1, 0, 23, 59, 59, 999);
    try {
        const inicioAnio = new Date(anio, 0, 1, 0, 0, 0, 0);
        const finAnio = new Date(anio, 11, 31, 23, 59, 59, 999);
        const [partes, checklists, carros, partesAnio, partesMesAnterior, usuariosActivos] = await Promise.all([
            prisma_js_1.prisma.parteEmergencia.findMany({
                where: wherePartesSinDemo({ gte: inicio, lte: fin }),
                include: {
                    unidades: {
                        include: {
                            carro: { select: { id: true, nomenclatura: true } },
                        },
                    },
                },
            }),
            prisma_js_1.prisma.checklistCarro.findMany({
                where: {
                    fecha: { gte: inicio, lte: fin },
                    tipo: 'UNIDAD',
                },
                select: {
                    carroId: true,
                    fecha: true,
                },
            }),
            prisma_js_1.prisma.carro.findMany({
                select: {
                    id: true,
                    nomenclatura: true,
                },
            }),
            prisma_js_1.prisma.parteEmergencia.findMany({
                where: wherePartesSinDemo({ gte: inicioAnio, lte: finAnio }),
                select: { id: true, fecha: true, metadata: true },
            }),
            prisma_js_1.prisma.parteEmergencia.findMany({
                where: wherePartesSinDemo({ gte: inicioMesAnterior, lte: finMesAnterior }),
                select: {
                    fecha: true,
                    unidades: {
                        select: {
                            kmSalida: true,
                            kmLlegada: true,
                        },
                    },
                },
            }),
            prisma_js_1.prisma.usuario.findMany({
                where: {
                    activo: true,
                    NOT: [{ rol: { equals: 'ADMIN', mode: 'insensitive' } }, { nombre: 'Administrador SIDEP' }],
                },
                select: { id: true, nombre: true, email: true, rut: true, rol: true, cargoOficialidad: true, tipoVoluntario: true },
            }),
        ]);
        const usuariosAsistenciaValidos = usuariosActivos.filter((u) => {
            const esAdmin = String(u.rol ?? '')
                .trim()
                .toUpperCase() === 'ADMIN' || String(u.nombre ?? '').trim() === 'Administrador SIDEP';
            return !esAdmin && !esTipoExcluidoAsistencia(u.tipoVoluntario) && !esUsuarioDemo(u.nombre, u.email, u.rut);
        });
        const idsUsuariosAsistenciaValidos = new Set(usuariosAsistenciaValidos.map((u) => u.id));
        const tiemposDespacho = [];
        const tiemposRespuesta = [];
        const duraciones = [];
        const sectoresMap = new Map();
        const usoUnidadMap = new Map();
        const checksPorUnidadMap = new Map();
        for (const c of carros) {
            usoUnidadMap.set(c.id, { id: c.id, nomenclatura: c.nomenclatura, salidas: 0, km: 0 });
            checksPorUnidadMap.set(c.id, new Set());
        }
        for (const chk of checklists) {
            const key = chk.fecha.toISOString().slice(0, 10);
            if (!checksPorUnidadMap.has(chk.carroId))
                checksPorUnidadMap.set(chk.carroId, new Set());
            checksPorUnidadMap.get(chk.carroId)?.add(key);
        }
        for (const p of partes) {
            const base = new Date(p.fecha);
            const sector = extraerSector(p.direccion);
            for (const u of p.unidades) {
                const salida = parseHoraEnFecha(base, u.horaSalida);
                const llegada = parseHoraEnFecha(base, u.horaLlegada);
                const disponible = parseHoraEnFecha(base, u.hora6_10);
                const despacho = diffMin(base, salida);
                if (despacho !== null)
                    tiemposDespacho.push(despacho);
                const respuesta = diffMin(salida, llegada);
                if (respuesta !== null) {
                    tiemposRespuesta.push(respuesta);
                    const acc = sectoresMap.get(sector) ?? { totalMin: 0, casos: 0 };
                    acc.totalMin += respuesta;
                    acc.casos += 1;
                    sectoresMap.set(sector, acc);
                }
                const duracion = diffMin(salida, disponible);
                if (duracion !== null)
                    duraciones.push(duracion);
                const uso = usoUnidadMap.get(u.carroId);
                if (uso) {
                    uso.salidas += 1;
                    const deltaKm = Number(u.kmLlegada) - Number(u.kmSalida);
                    if (Number.isFinite(deltaKm) && deltaKm >= 0) {
                        uso.km += deltaKm;
                    }
                }
            }
        }
        const promedio = (vals) => vals.length ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : 0;
        const sectores = Array.from(sectoresMap.entries())
            .map(([sector, d]) => ({
            sector,
            promedioRespuestaMin: d.casos ? Number((d.totalMin / d.casos).toFixed(2)) : 0,
            casos: d.casos,
        }))
            .sort((a, b) => b.promedioRespuestaMin - a.promedioRespuestaMin)
            .slice(0, 8);
        const usoUnidades = Array.from(usoUnidadMap.values())
            .map((u) => ({
            ...u,
            kilometrosPromedioPorSalida: u.salidas > 0 ? Number((u.km / u.salidas).toFixed(2)) : 0,
        }))
            .sort((a, b) => b.salidas - a.salidas || b.km - a.km);
        const cumplimientoChecklist = Array.from(usoUnidadMap.values())
            .map((u) => {
            const diasConChecklist = checksPorUnidadMap.get(u.id)?.size ?? 0;
            return {
                carroId: u.id,
                nomenclatura: u.nomenclatura,
                diasConChecklist,
                diasMes,
                cumplimientoPct: diasMes > 0 ? Number(((diasConChecklist / diasMes) * 100).toFixed(2)) : 0,
            };
        })
            .sort((a, b) => b.cumplimientoPct - a.cumplimientoPct);
        const salidasTotalesMes = usoUnidades.reduce((acc, u) => acc + u.salidas, 0);
        const kilometrosTotalesMes = usoUnidades.reduce((acc, u) => acc + u.km, 0);
        const respuestasEnSla = tiemposRespuesta.filter((x) => x <= 8).length;
        const cumplimientoRespuesta8MinPct = tiemposRespuesta.length > 0 ? Number(((respuestasEnSla / tiemposRespuesta.length) * 100).toFixed(2)) : 0;
        let salidasMesAnterior = 0;
        let kilometrosMesAnterior = 0;
        for (const p of partesMesAnterior) {
            salidasMesAnterior += p.unidades.length;
            for (const u of p.unidades) {
                const deltaKm = Number(u.kmLlegada) - Number(u.kmSalida);
                if (Number.isFinite(deltaKm) && deltaKm >= 0)
                    kilometrosMesAnterior += deltaKm;
            }
        }
        const variacionPct = (actual, anterior) => {
            if (anterior <= 0)
                return actual > 0 ? 100 : 0;
            return Number((((actual - anterior) / anterior) * 100).toFixed(2));
        };
        const comparativoMensual = {
            salidasMesAnterior,
            kilometrosMesAnterior,
            variacionSalidasPct: variacionPct(salidasTotalesMes, salidasMesAnterior),
            variacionKilometrosPct: variacionPct(kilometrosTotalesMes, kilometrosMesAnterior),
        };
        const semanasMes = Math.ceil(diasMes / 7);
        const salidasPorSemanaMap = new Map();
        for (let s = 1; s <= semanasMes; s++)
            salidasPorSemanaMap.set(s, 0);
        for (const p of partes) {
            const d = new Date(p.fecha);
            const semanaMes = Math.floor((d.getDate() - 1) / 7) + 1;
            salidasPorSemanaMap.set(semanaMes, (salidasPorSemanaMap.get(semanaMes) ?? 0) + p.unidades.length);
        }
        const salidasPorSemana = Array.from(salidasPorSemanaMap.entries()).map(([semana, salidas]) => ({
            semana,
            salidas,
        }));
        const mesesNombre = [
            'Enero',
            'Febrero',
            'Marzo',
            'Abril',
            'Mayo',
            'Junio',
            'Julio',
            'Agosto',
            'Septiembre',
            'Octubre',
            'Noviembre',
            'Diciembre',
        ];
        const asistenciaPorMes = new Map();
        const asistenciaDetallePorMes = new Map();
        for (let idx = 1; idx <= 12; idx++) {
            asistenciaPorMes.set(idx, { presentesUnicos: new Set(), asistenciasRegistradas: 0 });
            asistenciaDetallePorMes.set(idx, new Map());
        }
        for (const parte of partesAnio) {
            const mesParte = new Date(parte.fecha).getMonth() + 1;
            const bucket = asistenciaPorMes.get(mesParte);
            const detalleMes = asistenciaDetallePorMes.get(mesParte);
            if (!bucket)
                continue;
            const asistencias = extraerAsistenciasMetadata(parte.metadata);
            for (const item of asistencias) {
                if (!item.presente)
                    continue;
                if (!idsUsuariosAsistenciaValidos.has(item.usuarioId))
                    continue;
                bucket.presentesUnicos.add(item.usuarioId);
                bucket.asistenciasRegistradas += 1;
                if (detalleMes) {
                    const curr = detalleMes.get(item.usuarioId) ?? { asistencias: 0, partes: new Set() };
                    curr.asistencias += 1;
                    curr.partes.add(parte.id);
                    detalleMes.set(item.usuarioId, curr);
                }
            }
        }
        const asistenciaVoluntariosPorMes = Array.from(asistenciaPorMes.entries()).map(([mesId, values]) => ({
            mes: mesId,
            nombreMes: mesesNombre[mesId - 1] ?? `Mes ${mesId}`,
            voluntariosConAsistencia: values.presentesUnicos.size,
            asistenciasRegistradas: values.asistenciasRegistradas,
        }));
        const asistenciaVoluntariosTotalAnual = asistenciaVoluntariosPorMes.reduce((acc, row) => acc + row.asistenciasRegistradas, 0);
        const nombreUsuarioPorId = new Map(usuariosAsistenciaValidos.map((u) => [u.id, { nombre: u.nombre, rol: u.rol, cargo: u.cargoOficialidad ?? null }]));
        const asistenciaVoluntariosDetallePorMes = Array.from(asistenciaDetallePorMes.entries()).map(([mesId, mapa]) => ({
            mes: mesId,
            nombreMes: mesesNombre[mesId - 1] ?? `Mes ${mesId}`,
            voluntarios: Array.from(mapa.entries())
                .map(([usuarioId, d]) => ({
                usuarioId,
                nombre: nombreUsuarioPorId.get(usuarioId)?.nombre ?? `Usuario #${usuarioId}`,
                rol: nombreUsuarioPorId.get(usuarioId)?.rol ?? 'VOLUNTARIO',
                cargo: nombreUsuarioPorId.get(usuarioId)?.cargo ?? null,
                asistenciasRegistradas: d.asistencias,
                partesConAsistencia: d.partes.size,
            }))
                .sort((a, b) => b.asistenciasRegistradas - a.asistenciasRegistradas || b.partesConAsistencia - a.partesConAsistencia),
        }));
        res.json({
            anio,
            mes,
            tiempoDespachoPromedioMin: promedio(tiemposDespacho),
            tiempoRespuestaPromedioMin: promedio(tiemposRespuesta),
            duracionPromedioEmergenciaMin: promedio(duraciones),
            cumplimientoRespuesta8MinPct,
            salidasTotalesMes,
            kilometrosTotalesMes,
            sectoresCriticos: sectores,
            usoUnidades,
            cumplimientoChecklist,
            comparativoMensual,
            salidasPorSemana,
            asistenciaVoluntariosPorMes,
            asistenciaVoluntariosTotalAnual,
            asistenciaVoluntariosDetallePorMes,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'No se pudo generar analítica operacional' });
    }
});
exports.reportesRouter.get('/cuadro-honor', async (req, res) => {
    const hoy = new Date();
    const anio = Number(req.query.anio) || hoy.getFullYear();
    const mes = Number(req.query.mes) || hoy.getMonth() + 1;
    if (!Number.isFinite(anio) || !Number.isFinite(mes) || mes < 1 || mes > 12) {
        res.status(400).json({ error: 'anio/mes inválidos' });
        return;
    }
    const inicioMes = new Date(anio, mes - 1, 1);
    const finMes = new Date(anio, mes, 0, 23, 59, 59, 999);
    const finQuincena = new Date(anio, mes - 1, 15, 23, 59, 59, 999);
    const inicioAnio = new Date(anio, 0, 1);
    try {
        const [usuarios, partesMes, partesAnio] = await Promise.all([
            prisma_js_1.prisma.usuario.findMany({
                where: {
                    activo: true,
                    NOT: [{ rol: { equals: 'ADMIN', mode: 'insensitive' } }, { nombre: 'Administrador SIDEP' }],
                    OR: [{ tipoVoluntario: null }, { tipoVoluntario: { notIn: ['CADETE', 'ASPIRANTE'] } }],
                },
                select: { id: true, nombre: true, email: true, rut: true, cargoOficialidad: true, tipoVoluntario: true },
            }),
            prisma_js_1.prisma.parteEmergencia.findMany({
                where: { fecha: { gte: inicioMes, lte: finMes } },
                select: { fecha: true, metadata: true },
            }),
            prisma_js_1.prisma.parteEmergencia.findMany({
                where: { fecha: { gte: inicioAnio, lte: finMes } },
                select: { fecha: true, metadata: true },
            }),
        ]);
        const usuariosValidos = usuarios.filter((u) => !esUsuarioDemo(u.nombre, u.email, u.rut));
        const diasMes = new Map();
        const diasAnio = new Map();
        const diasQuincena = new Map();
        const idsUsuariosValidos = new Set(usuariosValidos.map((u) => u.id));
        const acumular = (rows, target) => {
            for (const row of rows) {
                const meta = row.metadata;
                const apc = meta?.asistencia?.asistenciaPorContexto;
                if (!apc || typeof apc !== 'object')
                    continue;
                const dia = row.fecha.toISOString().slice(0, 10);
                for (const mapa of Object.values(apc)) {
                    if (!mapa || typeof mapa !== 'object')
                        continue;
                    for (const [k, v] of Object.entries(mapa)) {
                        if (!v || !k.startsWith('usr-'))
                            continue;
                        const uid = Number(k.slice(4));
                        if (!Number.isFinite(uid) || uid <= 0)
                            continue;
                        if (!idsUsuariosValidos.has(uid))
                            continue;
                        if (!target.has(uid))
                            target.set(uid, new Set());
                        target.get(uid)?.add(dia);
                    }
                }
            }
        };
        acumular(partesMes, diasMes);
        acumular(partesAnio, diasAnio);
        acumular(partesMes.filter((r) => new Date(r.fecha).getTime() <= finQuincena.getTime()), diasQuincena);
        const rows = usuariosValidos
            .map((u) => ({
            usuarioId: u.id,
            nombre: u.nombre,
            cargo: u.cargoOficialidad ?? 'SIN CARGO',
            tipo: u.tipoVoluntario ?? 'NO DEFINIDO',
            diasMensual: diasMes.get(u.id)?.size ?? 0,
            diasAnual: diasAnio.get(u.id)?.size ?? 0,
            diasQuincena: diasQuincena.get(u.id)?.size ?? 0,
        }))
            .filter((r) => r.nombre.trim() !== 'Administrador SIDEP')
            .filter((r) => r.diasMensual > 0 || r.diasAnual > 0 || r.diasQuincena > 0)
            .sort((a, b) => b.diasQuincena - a.diasQuincena || b.diasMensual - a.diasMensual || b.diasAnual - a.diasAnual)
            .slice(0, 15);
        res.json({
            anio,
            mes,
            rango: {
                inicioMes: inicioMes.toISOString(),
                finMes: finMes.toISOString(),
                finQuincena: finQuincena.toISOString(),
            },
            rows,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'No se pudo generar cuadro de honor' });
    }
});
//# sourceMappingURL=reportes.js.map