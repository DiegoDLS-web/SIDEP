"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.actualizarEstadoEjecucion = exports.obtenerDetalleEjecucion = exports.actualizarPlantilla = exports.obtenerHistorial = exports.registrarEjecucion = exports.crearPlantilla = void 0;
const prisma_1 = __importDefault(require("../../../prisma"));
const utils_1 = require("../../../utils");
const crypto_1 = require("crypto");
const TIPOS_CHECKLIST_UNIDAD = new Set(['CARRO', 'UNIDAD']);
const crearPlantilla = async (datos) => {
    return await prisma_1.default.checklistPlantilla.create({
        data: {
            id: (0, crypto_1.randomUUID)(),
            codigo: String(datos.codigo),
            nombre: String(datos.nombre),
            descripcion: datos.descripcion ? String(datos.descripcion) : null,
            entidadTipo: String(datos.entidadTipo || 'CARRO'),
            estructuraJson: JSON.stringify(datos.estructuraJson),
            version: 1,
            activo: 1
        }
    });
};
exports.crearPlantilla = crearPlantilla;
async function resolverPlantillaId(carroId, entidadTipo, plantillaId) {
    if (plantillaId?.trim()) {
        const existe = await prisma_1.default.checklistPlantilla.findUnique({ where: { id: plantillaId.trim() } });
        if (existe)
            return existe.id;
    }
    const carro = await prisma_1.default.carro.findUnique({ where: { id: carroId }, select: { nomenclatura: true } });
    const nomenclatura = carro?.nomenclatura ?? 'GEN';
    const codigo = entidadTipo === 'ERA' ? `ERA-${nomenclatura}` : `CHK-${nomenclatura}`;
    const existente = await prisma_1.default.checklistPlantilla.findFirst({ where: { codigo } });
    if (existente)
        return existente.id;
    const creada = await prisma_1.default.checklistPlantilla.create({
        data: {
            id: (0, crypto_1.randomUUID)(),
            codigo,
            nombre: `Plantilla ${codigo}`,
            entidadTipo,
            estructuraJson: JSON.stringify([]),
            version: 1,
            activo: 1,
        },
    });
    return creada.id;
}
const registrarEjecucion = async (carroId, revisorRut, plantillaId, resultados, opciones) => {
    const carro = await prisma_1.default.carro.findUnique({ where: { id: carroId } });
    if (!carro)
        throw new utils_1.AppError('El carro especificado no existe en el sistema', 404);
    const entidadTipo = String(opciones?.entidadTipo || 'CARRO').trim() || 'CARRO';
    const plantillaResuelta = await resolverPlantillaId(carroId, entidadTipo, plantillaId);
    const payload = resultados != null && typeof resultados === 'object'
        ? { ...resultados }
        : { items: resultados };
    const esChecklistUnidad = TIPOS_CHECKLIST_UNIDAD.has(entidadTipo.toUpperCase());
    const esBorrador = (0, utils_1.esChecklistBorrador)(payload);
    const estadoChecklistManual = typeof payload['estadoChecklist'] === 'string' ? String(payload['estadoChecklist']).trim().toUpperCase() : '';
    if (estadoChecklistManual && !esBorrador) {
        payload['estadoChecklist'] = estadoChecklistManual;
    }
    const evaluacion = esChecklistUnidad && !esBorrador
        ? (0, utils_1.evaluarEstadoOperativoDesdeChecklist)(payload)
        : null;
    let estadoRegistro = 'COMPLETADO';
    if (esBorrador) {
        estadoRegistro = 'BORRADOR';
    }
    else if (estadoChecklistManual === 'PENDIENTE') {
        estadoRegistro = 'PENDIENTE';
    }
    else if (estadoChecklistManual === 'CON_OBSERVACION') {
        estadoRegistro = 'CON_OBSERVACION';
    }
    const ejecucion = await prisma_1.default.$transaction(async (tx) => {
        const creada = await tx.checklistEjecucion.create({
            data: {
                id: (0, crypto_1.randomUUID)(),
                plantillaId: plantillaResuelta,
                revisorRut: String(revisorRut),
                fechaRevision: new Date(),
                estado: estadoRegistro,
                respuestasJson: JSON.stringify(payload),
                entidadTipo,
                entidadId: String(carroId),
                firmaOficial: opciones?.firmaOficial ?? null,
                firmaRevisor: opciones?.firmaInspector ?? null,
            },
        });
        if (evaluacion) {
            await tx.carro.update({
                where: { id: carroId },
                data: { estadoOperativo: evaluacion.estadoOperativo },
            });
        }
        return creada;
    });
    return {
        ...ejecucion,
        estadoOperativoActualizado: evaluacion?.estadoOperativo ?? null,
        semaforoUnidad: evaluacion?.semaforo ?? null,
    };
};
exports.registrarEjecucion = registrarEjecucion;
const obtenerHistorial = async (carroId, opciones) => {
    const whereClause = {};
    if (carroId)
        whereClause.entidadId = carroId;
    const tipoFiltro = opciones?.entidadTipo?.trim().toUpperCase();
    if (tipoFiltro && tipoFiltro !== 'UNIDAD') {
        whereClause.entidadTipo = tipoFiltro;
    }
    const rows = await prisma_1.default.checklistEjecucion.findMany({
        where: whereClause,
        include: {
            revisor: { select: { nombres: true, apellidoPaterno: true } },
            plantilla: { select: { nombre: true } },
        },
        orderBy: { fechaRevision: 'desc' },
    });
    const excluirBorradores = opciones?.excluirBorradores !== false;
    return rows.filter((row) => {
        if (excluirBorradores && (row.estado === 'BORRADOR' || (0, utils_1.esChecklistBorrador)(row.respuestasJson))) {
            return false;
        }
        if (tipoFiltro === 'UNIDAD') {
            const t = String(row.entidadTipo ?? '').toUpperCase();
            return t === 'CARRO' || t === 'UNIDAD';
        }
        return true;
    });
};
exports.obtenerHistorial = obtenerHistorial;
const actualizarPlantilla = async (id, datos) => {
    const plantilla = await prisma_1.default.checklistPlantilla.findUnique({ where: { id } });
    if (!plantilla)
        throw new utils_1.AppError('Plantilla no encontrada', 404);
    const dataToUpdate = {};
    if (datos.nombre !== undefined)
        dataToUpdate.nombre = String(datos.nombre);
    if (datos.descripcion !== undefined)
        dataToUpdate.descripcion = String(datos.descripcion);
    if (datos.estructuraJson !== undefined)
        dataToUpdate.estructuraJson = JSON.stringify(datos.estructuraJson);
    if (datos.activo !== undefined)
        dataToUpdate.activo = Number(datos.activo);
    return await prisma_1.default.checklistPlantilla.update({
        where: { id },
        data: dataToUpdate
    });
};
exports.actualizarPlantilla = actualizarPlantilla;
const obtenerDetalleEjecucion = async (id) => {
    const ejecucion = await prisma_1.default.checklistEjecucion.findUnique({
        where: { id },
        include: {
            revisor: { select: { nombres: true, apellidoPaterno: true, rut: true } },
            plantilla: { select: { nombre: true, codigo: true } }
        }
    });
    if (!ejecucion)
        throw new utils_1.AppError('Ejecución de checklist no encontrada', 404);
    return ejecucion;
};
exports.obtenerDetalleEjecucion = obtenerDetalleEjecucion;
const ESTADOS_CHECKLIST_PERMITIDOS = new Set(['COMPLETADO', 'PENDIENTE', 'CON_OBSERVACION']);
function parseRespuestasEjecucion(raw) {
    if (!raw)
        return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed
            : {};
    }
    catch {
        return {};
    }
}
const actualizarEstadoEjecucion = async (id, estadoChecklist, opts) => {
    const estado = String(estadoChecklist ?? '').trim().toUpperCase();
    if (!ESTADOS_CHECKLIST_PERMITIDOS.has(estado)) {
        throw new utils_1.AppError('Estado de checklist inválido', 400);
    }
    const motivo = String(opts?.motivo ?? '').trim();
    if (motivo.length < 8) {
        throw new utils_1.AppError('Debe indicar el motivo del cambio (mínimo 8 caracteres).', 400);
    }
    const fechaEfectiva = String(opts?.fechaEfectiva ?? '').trim();
    if (!fechaEfectiva) {
        throw new utils_1.AppError('Debe indicar la fecha del cambio.', 400);
    }
    const ejecucion = await prisma_1.default.checklistEjecucion.findUnique({ where: { id } });
    if (!ejecucion)
        throw new utils_1.AppError('Ejecución de checklist no encontrada', 404);
    const detalle = parseRespuestasEjecucion(ejecucion.respuestasJson);
    const estadoAnterior = String((typeof detalle['estadoChecklist'] === 'string' ? detalle['estadoChecklist'] : null) ??
        ejecucion.estado ??
        '').toUpperCase();
    detalle['estadoChecklist'] = estado;
    if (detalle['borrador'] === true) {
        detalle['borrador'] = false;
    }
    const registroCambio = {
        estadoAnterior,
        estadoNuevo: estado,
        motivo,
        fechaEfectiva,
        actorRut: opts?.actorRut ?? null,
        registradoEn: new Date().toISOString(),
    };
    const historial = Array.isArray(detalle['historialCambiosEstado'])
        ? detalle['historialCambiosEstado']
        : [];
    historial.unshift(registroCambio);
    detalle['historialCambiosEstado'] = historial.slice(0, 30);
    detalle['ultimoCambioEstado'] = registroCambio;
    const actualizado = await prisma_1.default.checklistEjecucion.update({
        where: { id },
        data: {
            estado,
            respuestasJson: JSON.stringify(detalle),
        },
    });
    return { ejecucion: actualizado, estadoAnterior, estadoNuevo: estado, motivo, fechaEfectiva };
};
exports.actualizarEstadoEjecucion = actualizarEstadoEjecucion;
