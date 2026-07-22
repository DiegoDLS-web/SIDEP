"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluarSemaforoMantenimientoEnFecha = evaluarSemaforoMantenimientoEnFecha;
exports.motivoSemaforoParte = motivoSemaforoParte;
exports.evaluarDisponibilidadVoluntarioEnParte = evaluarDisponibilidadVoluntarioEnParte;
exports.assertVoluntarioPuedeParticiparEnParte = assertVoluntarioPuedeParticiparEnParte;
exports.evaluarCarroDisponibleParaParte = evaluarCarroDisponibleParaParte;
const checklist_estado_operativo_util_1 = require("./checklist-estado-operativo.util");
const usuario_acceso_util_1 = require("./usuario-acceso.util");
function inicioDia(fecha) {
    const d = new Date(fecha);
    d.setHours(0, 0, 0, 0);
    return d;
}
function finDia(fecha) {
    const d = new Date(fecha);
    d.setHours(23, 59, 59, 999);
    return d;
}
function fechaEnRango(base, desde, hasta) {
    const b = inicioDia(base).getTime();
    const d = inicioDia(desde).getTime();
    const h = inicioDia(hasta).getTime();
    return b >= d && b <= h;
}
function rangoDesdeObservaciones(txt, kind) {
    if (!txt?.trim())
        return null;
    const t = txt.toLowerCase();
    const key = kind === 'susp' ? 'susp' : 'lic';
    const reCompact = new RegExp(`${key}\\w*\\s*\\[\\s*(\\d{4}-\\d{2}-\\d{2})\\s*[,;]\\s*(\\d{4}-\\d{2}-\\d{2})\\s*\\]`);
    const mCompact = reCompact.exec(t);
    if (mCompact) {
        const d = new Date(`${mCompact[1]}T00:00:00`);
        const h = new Date(`${mCompact[2]}T00:00:00`);
        if (!Number.isNaN(d.getTime()) && !Number.isNaN(h.getTime()))
            return { desde: d, hasta: h };
    }
    const reDesde = new RegExp(`${key}\\w*[_\\s-]*desde\\s*[:=]\\s*(\\d{4}-\\d{2}-\\d{2})`);
    const reHasta = new RegExp(`${key}\\w*[_\\s-]*hasta\\s*[:=]\\s*(\\d{4}-\\d{2}-\\d{2})`);
    const mD = reDesde.exec(t);
    const mH = reHasta.exec(t);
    if (mD && mH) {
        const d = new Date(`${mD[1]}T00:00:00`);
        const h = new Date(`${mH[1]}T00:00:00`);
        if (!Number.isNaN(d.getTime()) && !Number.isNaN(h.getTime()))
            return { desde: d, hasta: h };
    }
    return null;
}
function evaluarSemaforoMantenimientoEnFecha(fechas, fechaReferencia) {
    const ref = inicioDia(fechaReferencia);
    for (const raw of [fechas.proximoMantenimiento, fechas.proximaRevisionTecnica]) {
        if (!raw)
            continue;
        const d = inicioDia(new Date(raw));
        if (Number.isNaN(d.getTime()))
            continue;
        if (d < ref)
            return 'mantencion';
    }
    return null;
}
function motivoSemaforoParte(semaforo) {
    if (semaforo === 'fuera_servicio')
        return 'fuera de servicio';
    if (semaforo === 'mantencion')
        return 'en mantención o con revisión vencida';
    return 'operativa';
}
async function usuarioTieneLicenciaMedicaEnFecha(tx, rut, fecha) {
    const licencia = await tx.licenciaMedica.findFirst({
        where: {
            usuarioRut: rut,
            fechaInicio: { lte: finDia(fecha) },
            fechaTermino: { gte: inicioDia(fecha) },
            estado: { nombre: { equals: 'Aprobada', mode: 'insensitive' } },
        },
        select: { id: true },
    });
    return !!licencia;
}
function evaluarDisponibilidadVoluntarioEnParte(usuario, fechaReferencia, opts) {
    if (!(0, usuario_acceso_util_1.puedeAccederApp)(usuario)) {
        return { disponible: false, motivo: 'voluntario inactivo o de baja' };
    }
    const tipo = (usuario.tipoVoluntario?.codigo ?? usuario.tipoVoluntario?.nombre ?? '').trim().toUpperCase();
    const estado = (usuario.estadoVoluntario?.codigo ?? usuario.estadoVoluntario?.nombre ?? '').trim().toUpperCase();
    const obs = usuario.observacionesRegistro ?? '';
    const rangoSusp = rangoDesdeObservaciones(obs, 'susp');
    const rangoLic = rangoDesdeObservaciones(obs, 'lic');
    if ((tipo.includes('SUSP') || estado.includes('SUSP')) && (!rangoSusp || fechaEnRango(fechaReferencia, rangoSusp.desde, rangoSusp.hasta))) {
        return { disponible: false, motivo: 'voluntario suspendido en la fecha del parte' };
    }
    if (opts?.licenciaMedicaActiva) {
        return { disponible: false, motivo: 'voluntario con licencia médica en la fecha del parte' };
    }
    if (tipo.includes('LICEN') && (!rangoLic || fechaEnRango(fechaReferencia, rangoLic.desde, rangoLic.hasta))) {
        return { disponible: false, motivo: 'voluntario con licencia en la fecha del parte' };
    }
    return { disponible: true };
}
async function assertVoluntarioPuedeParticiparEnParte(tx, rut, fechaReferencia, rol) {
    const usuario = await tx.usuario.findUnique({
        where: { rut },
        include: { estadoVoluntario: true, tipoVoluntario: true },
    });
    if (!usuario) {
        throw new Error(`El ${rol} con RUT ${rut} no existe.`);
    }
    const licencia = await usuarioTieneLicenciaMedicaEnFecha(tx, rut, fechaReferencia);
    const evaluacion = evaluarDisponibilidadVoluntarioEnParte(usuario, fechaReferencia, {
        licenciaMedicaActiva: licencia,
    });
    if (!evaluacion.disponible) {
        const nombre = `${usuario.nombres ?? ''} ${usuario.apellidoPaterno ?? ''}`.trim() || rut;
        throw new Error(`No se puede asignar a ${nombre} como ${rol}: ${evaluacion.motivo ?? 'no disponible en la fecha del parte'}.`);
    }
}
async function ultimoChecklistUnidadHasta(tx, carroId, fechaReferencia) {
    const ejecuciones = await tx.checklistEjecucion.findMany({
        where: {
            entidadId: carroId,
            entidadTipo: { in: ['CARRO', 'UNIDAD'] },
            fechaRevision: { lte: finDia(fechaReferencia) },
        },
        orderBy: { fechaRevision: 'desc' },
        take: 20,
    });
    return ejecuciones.find((e) => e.estado !== 'BORRADOR' && !(0, checklist_estado_operativo_util_1.esChecklistBorrador)(e.respuestasJson)) ?? null;
}
async function evaluarCarroDisponibleParaParte(tx, carroId, fechaReferencia) {
    const carro = await tx.carro.findUnique({
        where: { id: carroId },
        include: {
            mantenimientos: { orderBy: { fechaRegistro: 'desc' }, take: 1 },
        },
    });
    if (!carro) {
        return { disponible: false, semaforo: 'fuera_servicio', motivo: 'unidad no encontrada' };
    }
    const checklist = await ultimoChecklistUnidadHasta(tx, carroId, fechaReferencia);
    const semaforoManualDb = carro.estadoOperativo === 0
        ? 'fuera_servicio'
        : carro.estadoOperativo === 2
            ? 'mantencion'
            : null;
    const semaforoChecklist = checklist
        ? (0, checklist_estado_operativo_util_1.resolverSemaforoDesdeChecklist)(checklist.respuestasJson)
        : semaforoManualDb ?? 'operativa';
    const mant = carro.mantenimientos[0];
    const semaforoMantenimiento = evaluarSemaforoMantenimientoEnFecha({
        proximoMantenimiento: mant?.fechaProximoMantenimiento ?? null,
        proximaRevisionTecnica: mant?.fechaProximaRevTecnica ?? null,
    }, fechaReferencia);
    const semaforo = (0, checklist_estado_operativo_util_1.combinarSemaforos)(semaforoChecklist ?? semaforoManualDb, semaforoManualDb, semaforoMantenimiento);
    const disponible = semaforo === 'operativa';
    return {
        disponible,
        semaforo,
        nomenclatura: carro.nomenclatura,
        ...(disponible ? {} : { motivo: motivoSemaforoParte(semaforo) }),
    };
}
