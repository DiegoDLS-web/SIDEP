"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cambiarEstadoOperativo = exports.historialMantenimientoGeneral = exports.obtenerCarros = exports.actualizarMantenimientoHistorial = exports.actualizarCarro = exports.crearCarro = exports.obtenerCarroEnriquecido = void 0;
const prisma_1 = __importDefault(require("../../../prisma"));
const utils_1 = require("../../../utils");
const crypto_1 = require("crypto");
const carro_estado_auditoria_util_1 = require("../../../utils/carro-estado-auditoria.util");
const METADATA = {
    'B-1': { tipo: 'Bomba', capacidadAgua: '5000 litros', anioFabricacion: 2004 },
    'BX-1': { tipo: 'Multipropósito', capacidadAgua: '3000 litros', anioFabricacion: 2017 },
    'R-1': { tipo: 'Rescate', capacidadAgua: '2000 litros', anioFabricacion: 2021 },
};
/** Combina campos no vacíos del historial (más reciente primero) para ficha completa en pantalla. */
function fusionarFichaDesdeHistorial(mantenimientos) {
    const base = mapMantenimientoAFicha(null);
    for (const m of mantenimientos) {
        const parcial = mapMantenimientoAFicha(m);
        for (const [clave, valor] of Object.entries(parcial)) {
            if (valor == null || String(valor).trim() === '')
                continue;
            if (base[clave] == null || String(base[clave]).trim() === '') {
                base[clave] = valor;
            }
        }
    }
    return base;
}
function enriquecerCarro(carro) {
    const meta = METADATA[carro.nomenclatura];
    return {
        ...carro,
        kilometraje: Number(carro.kilometraje ?? 0),
        tipo: meta?.tipo ?? null,
        capacidadAgua: meta?.capacidadAgua ?? null,
        anioFabricacion: meta?.anioFabricacion ?? null,
    };
}
function toDateOnly(iso) {
    if (!iso)
        return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
}
function isoFromDateOnly(value) {
    if (!value)
        return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime()))
        return null;
    return d.toISOString();
}
function nombreUsuario(u) {
    if (!u)
        return null;
    const n = [u.nombres, u.apellidoPaterno].filter(Boolean).join(' ').trim();
    return n || null;
}
function empaquetarDescripcionYFirma(descripcion, firma) {
    const texto = (descripcion ?? '').trim();
    const f = (firma ?? '').trim();
    if (!texto && !f)
        return null;
    if (f.startsWith('data:image')) {
        return JSON.stringify({ texto, firma: f });
    }
    return texto || null;
}
function desempaquetarDescripcionYFirma(raw) {
    const val = (raw ?? '').trim();
    if (!val)
        return { descripcion: null, firma: null };
    if (val.startsWith('{')) {
        try {
            const parsed = JSON.parse(val);
            if (parsed && typeof parsed === 'object') {
                return {
                    descripcion: (parsed.texto ?? '').trim() || null,
                    firma: (parsed.firma ?? '').trim().startsWith('data:image') ? parsed.firma.trim() : null,
                };
            }
        }
        catch {
            /* texto plano */
        }
    }
    return { descripcion: val, firma: null };
}
function mapMantenimientoAFicha(m) {
    if (!m) {
        return {
            ultimoMantenimiento: null,
            proximoMantenimiento: null,
            proximaRevisionTecnica: null,
            ultimaRevisionBombaAgua: null,
            descripcionUltimoMantenimiento: null,
            ultimoInspector: null,
            firmaUltimoInspector: null,
            fechaUltimaInspeccion: null,
            ultimoConductor: null,
            conductorAsignado: null,
        };
    }
    const ultimoInspector = m.inspectorNombre?.trim() || nombreUsuario(m.inspector) || null;
    const ultimoConductor = m.conductorNombre?.trim() || nombreUsuario(m.conductor) || null;
    const desemp = desempaquetarDescripcionYFirma(m.descripcion);
    const firmaCol = (m.firmaInspector ?? '').trim();
    return {
        ultimoMantenimiento: isoFromDateOnly(m.fechaMantenimiento),
        proximoMantenimiento: isoFromDateOnly(m.fechaProximoMantenimiento),
        proximaRevisionTecnica: isoFromDateOnly(m.fechaProximaRevTecnica),
        ultimaRevisionBombaAgua: isoFromDateOnly(m.fechaRevBomba),
        descripcionUltimoMantenimiento: desemp.descripcion,
        ultimoInspector,
        firmaUltimoInspector: firmaCol.startsWith('data:image') ? firmaCol : desemp.firma,
        fechaUltimaInspeccion: isoFromDateOnly(m.fechaInspeccion),
        ultimoConductor,
        conductorAsignado: ultimoConductor,
    };
}
function mapMantenimientoAHistorial(m) {
    const ficha = mapMantenimientoAFicha(m);
    return {
        id: m.id,
        carroId: m.carroId,
        creadoEn: m.fechaRegistro instanceof Date ? m.fechaRegistro.toISOString() : String(m.fechaRegistro),
        ...ficha,
    };
}
const mantenimientoInclude = {
    inspector: { select: { rut: true, nombres: true, apellidoPaterno: true } },
    conductor: { select: { rut: true, nombres: true, apellidoPaterno: true } },
};
async function resolverRutPorNombre(nombre) {
    const n = (nombre ?? '').trim();
    if (!n)
        return null;
    const usuario = await prisma_1.default.usuario.findFirst({
        where: { nombres: { equals: n, mode: 'insensitive' } },
        select: { rut: true },
    });
    return usuario?.rut ?? null;
}
async function obtenerUltimoCambioEstadoOperativo(carroId) {
    const row = await prisma_1.default.auditoriaUsuario.findFirst({
        where: {
            accion: 'CAMBIAR_ESTADO_CARRO',
            resultado: 'OK',
            entidadId: carroId,
        },
        orderBy: { createdAt: 'desc' },
        select: { detalle: true, createdAt: true },
    });
    if (!row)
        return null;
    const parsed = (0, carro_estado_auditoria_util_1.parsearUltimoCambioEstadoCarro)(row.detalle);
    if (!parsed)
        return null;
    return { ...parsed, registradoEn: row.createdAt.toISOString() };
}
const obtenerCarroEnriquecido = async (id) => {
    const carro = await prisma_1.default.carro.findUnique({
        where: { id },
        include: {
            bolsos: true,
            materiales: true,
            mantenimientos: {
                orderBy: { fechaRegistro: 'desc' },
                take: 24,
                include: mantenimientoInclude,
            },
        },
    });
    if (!carro)
        throw new utils_1.AppError('Carro no encontrado', 404);
    const { mantenimientos, ...resto } = carro;
    const base = enriquecerCarro(resto);
    const ficha = fusionarFichaDesdeHistorial(mantenimientos ?? []);
    const ultimoCambioEstadoOperativo = await obtenerUltimoCambioEstadoOperativo(id);
    return { ...base, ...ficha, ultimoCambioEstadoOperativo };
};
exports.obtenerCarroEnriquecido = obtenerCarroEnriquecido;
function tieneDatosMantenimiento(datos) {
    const claves = [
        'ultimoMantenimiento',
        'proximoMantenimiento',
        'proximaRevisionTecnica',
        'ultimaRevisionBombaAgua',
        'descripcionUltimoMantenimiento',
        'ultimoInspector',
        'firmaUltimoInspector',
        'fechaUltimaInspeccion',
        'ultimoConductor',
        'conductorAsignado',
    ];
    return claves.some((k) => datos[k] !== undefined);
}
const crearCarro = async (datos) => {
    const existe = await prisma_1.default.carro.findUnique({ where: { nomenclatura: datos.nomenclatura } });
    if (existe)
        throw new utils_1.AppError('Ya existe un carro con esta nomenclatura', 400);
    return await prisma_1.default.carro.create({
        data: {
            id: (0, crypto_1.randomUUID)(),
            patente: datos.patente,
            nomenclatura: datos.nomenclatura,
            nombre: datos.nombre,
            marca: datos.marca,
            kilometraje: datos.kilometraje ? Number(datos.kilometraje) : 0,
            estadoOperativo: 1,
        },
    });
};
exports.crearCarro = crearCarro;
const actualizarCarro = async (id, datos) => {
    const carro = await prisma_1.default.carro.findUnique({ where: { id } });
    if (!carro)
        throw new utils_1.AppError('Carro no encontrado', 404);
    const dataToUpdate = {};
    if (datos.patente !== undefined)
        dataToUpdate.patente = datos.patente;
    if (datos.nomenclatura !== undefined)
        dataToUpdate.nomenclatura = datos.nomenclatura;
    if (datos.nombre !== undefined)
        dataToUpdate.nombre = datos.nombre;
    if (datos.marca !== undefined)
        dataToUpdate.marca = datos.marca;
    if (datos.kilometraje !== undefined)
        dataToUpdate.kilometraje = Number(datos.kilometraje);
    if (datos.estadoOperativo !== undefined)
        dataToUpdate.estadoOperativo = Number(datos.estadoOperativo);
    if (Object.keys(dataToUpdate).length > 0) {
        await prisma_1.default.carro.update({
            where: { id },
            data: dataToUpdate,
        });
    }
    if (tieneDatosMantenimiento(datos)) {
        const conductorNombre = (datos.ultimoConductor ?? datos.conductorAsignado ?? null);
        const [inspectorRut, conductorRut] = await Promise.all([
            resolverRutPorNombre(datos.ultimoInspector),
            resolverRutPorNombre(conductorNombre),
        ]);
        await prisma_1.default.mantenimientoCarro.create({
            data: {
                id: (0, crypto_1.randomUUID)(),
                carroId: id,
                fechaRegistro: new Date(),
                fechaMantenimiento: toDateOnly(datos.ultimoMantenimiento),
                fechaProximoMantenimiento: toDateOnly(datos.proximoMantenimiento),
                fechaProximaRevTecnica: toDateOnly(datos.proximaRevisionTecnica),
                fechaRevBomba: toDateOnly(datos.ultimaRevisionBombaAgua),
                fechaInspeccion: toDateOnly(datos.fechaUltimaInspeccion),
                inspectorRut,
                conductorRut,
                inspectorNombre: datos.ultimoInspector?.trim() || null,
                conductorNombre: conductorNombre?.trim() || null,
                firmaInspector: datos.firmaUltimoInspector ?? null,
                descripcion: empaquetarDescripcionYFirma(datos.descripcionUltimoMantenimiento, datos.firmaUltimoInspector),
            },
        });
    }
    return (0, exports.obtenerCarroEnriquecido)(id);
};
exports.actualizarCarro = actualizarCarro;
const actualizarMantenimientoHistorial = async (mantenimientoId, datos) => {
    const reg = await prisma_1.default.mantenimientoCarro.findUnique({ where: { id: mantenimientoId } });
    if (!reg)
        throw new utils_1.AppError('Registro de mantenimiento no encontrado', 404);
    const conductorNombre = (datos.ultimoConductor ?? datos.conductorAsignado ?? reg.conductorNombre);
    const inspectorNombre = datos.ultimoInspector !== undefined ? datos.ultimoInspector : reg.inspectorNombre;
    const [inspectorRut, conductorRut] = await Promise.all([
        datos.ultimoInspector !== undefined
            ? resolverRutPorNombre(datos.ultimoInspector)
            : Promise.resolve(reg.inspectorRut),
        datos.ultimoConductor !== undefined || datos.conductorAsignado !== undefined
            ? resolverRutPorNombre(conductorNombre)
            : Promise.resolve(reg.conductorRut),
    ]);
    const updateData = {};
    if (datos.ultimoMantenimiento !== undefined) {
        updateData.fechaMantenimiento = toDateOnly(datos.ultimoMantenimiento);
    }
    if (datos.proximoMantenimiento !== undefined) {
        updateData.fechaProximoMantenimiento = toDateOnly(datos.proximoMantenimiento);
    }
    if (datos.proximaRevisionTecnica !== undefined) {
        updateData.fechaProximaRevTecnica = toDateOnly(datos.proximaRevisionTecnica);
    }
    if (datos.ultimaRevisionBombaAgua !== undefined) {
        updateData.fechaRevBomba = toDateOnly(datos.ultimaRevisionBombaAgua);
    }
    if (datos.fechaUltimaInspeccion !== undefined) {
        updateData.fechaInspeccion = toDateOnly(datos.fechaUltimaInspeccion);
    }
    if (datos.ultimoInspector !== undefined) {
        updateData.inspectorNombre = datos.ultimoInspector?.trim() || null;
        updateData.inspectorRut = inspectorRut;
    }
    if (datos.ultimoConductor !== undefined || datos.conductorAsignado !== undefined) {
        updateData.conductorNombre = conductorNombre?.trim() || null;
        updateData.conductorRut = conductorRut;
    }
    if (datos.firmaUltimoInspector !== undefined) {
        updateData.firmaInspector = datos.firmaUltimoInspector ?? null;
    }
    if (datos.descripcionUltimoMantenimiento !== undefined || datos.firmaUltimoInspector !== undefined) {
        updateData.descripcion = empaquetarDescripcionYFirma(datos.descripcionUltimoMantenimiento ?? desempaquetarDescripcionYFirma(reg.descripcion).descripcion, datos.firmaUltimoInspector ?? reg.firmaInspector);
    }
    await prisma_1.default.mantenimientoCarro.update({
        where: { id: mantenimientoId },
        data: updateData,
    });
    const actualizado = await prisma_1.default.mantenimientoCarro.findUnique({
        where: { id: mantenimientoId },
        include: {
            carro: { select: { id: true, nomenclatura: true, nombre: true, patente: true } },
            ...mantenimientoInclude,
        },
    });
    if (!actualizado)
        throw new utils_1.AppError('Registro de mantenimiento no encontrado', 404);
    return {
        ...mapMantenimientoAHistorial(actualizado),
        carro: {
            id: actualizado.carro.id,
            nomenclatura: actualizado.carro.nomenclatura,
            nombre: actualizado.carro.nombre,
            patente: actualizado.carro.patente,
        },
    };
};
exports.actualizarMantenimientoHistorial = actualizarMantenimientoHistorial;
const obtenerCarros = async () => {
    const carros = await prisma_1.default.carro.findMany({
        include: {
            bolsos: true,
            materiales: true,
            mantenimientos: {
                orderBy: { fechaRegistro: 'desc' },
                take: 24,
                include: mantenimientoInclude,
            },
        },
        orderBy: { nomenclatura: 'asc' },
    });
    const carroIds = carros.map((c) => c.id);
    const ultimoKmPorCarro = new Map();
    if (carroIds.length > 0) {
        const unidades = await prisma_1.default.unidadEnEmergencia.findMany({
            where: { carroId: { in: carroIds } },
            select: { carroId: true, kmLlegada: true, kmSalida: true, horaLlegada: true },
            orderBy: { horaLlegada: 'desc' },
        });
        for (const u of unidades) {
            if (ultimoKmPorCarro.has(u.carroId))
                continue;
            const kmLlegada = Number(u.kmLlegada);
            const kmSalida = Number(u.kmSalida);
            const km = kmLlegada > 0 ? kmLlegada : kmSalida > 0 ? kmSalida : 0;
            if (km > 0)
                ultimoKmPorCarro.set(u.carroId, km);
        }
    }
    return carros.map((carro) => {
        const { mantenimientos, ...resto } = carro;
        const base = enriquecerCarro(resto);
        const ficha = fusionarFichaDesdeHistorial(mantenimientos ?? []);
        const ultimoKmDespacho = ultimoKmPorCarro.get(carro.id) ?? Number(carro.kilometraje ?? 0);
        return { ...base, ...ficha, ultimoKmDespacho };
    });
};
exports.obtenerCarros = obtenerCarros;
function parseFechaFiltroLocal(isoDate, finDeDia = false) {
    const t = isoDate.trim();
    const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) {
        const d = new Date(t);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const day = Number(m[3]);
    if (finDeDia)
        return new Date(y, mo, day, 23, 59, 59, 999);
    return new Date(y, mo, day, 0, 0, 0, 0);
}
const historialMantenimientoGeneral = async (filtros) => {
    const where = {};
    if (filtros.carroId?.trim()) {
        where.carroId = filtros.carroId.trim();
    }
    if (filtros.desde?.trim() || filtros.hasta?.trim()) {
        const fechaRegistro = {};
        if (filtros.desde?.trim()) {
            const d = parseFechaFiltroLocal(filtros.desde.trim(), false);
            if (d)
                fechaRegistro.gte = d;
        }
        if (filtros.hasta?.trim()) {
            const h = parseFechaFiltroLocal(filtros.hasta.trim(), true);
            if (h)
                fechaRegistro.lte = h;
        }
        if (Object.keys(fechaRegistro).length > 0) {
            where.fechaRegistro = fechaRegistro;
        }
    }
    const rows = await prisma_1.default.mantenimientoCarro.findMany({
        where,
        orderBy: { fechaRegistro: 'desc' },
        include: {
            carro: { select: { id: true, nomenclatura: true, nombre: true, patente: true } },
            ...mantenimientoInclude,
        },
    });
    return rows.map((m) => ({
        ...mapMantenimientoAHistorial(m),
        carro: {
            id: m.carro.id,
            nomenclatura: m.carro.nomenclatura,
            nombre: m.carro.nombre,
            patente: m.carro.patente,
        },
    }));
};
exports.historialMantenimientoGeneral = historialMantenimientoGeneral;
const cambiarEstadoOperativo = async (id, estado, opts) => {
    if (![0, 1, 2].includes(estado)) {
        throw new utils_1.AppError('Estado operativo inválido (0=fuera de servicio, 1=operativa, 2=mantención)', 400);
    }
    const motivo = String(opts?.motivo ?? '').trim();
    if (motivo.length < 8) {
        throw new utils_1.AppError('Debe indicar el motivo del cambio (mínimo 8 caracteres).', 400);
    }
    const fechaEfectiva = String(opts?.fechaEfectiva ?? '').trim();
    if (!fechaEfectiva) {
        throw new utils_1.AppError('Debe indicar la fecha del cambio.', 400);
    }
    const carro = await prisma_1.default.carro.findUnique({ where: { id } });
    if (!carro)
        throw new utils_1.AppError('Carro no encontrado', 404);
    const estadoAnterior = carro.estadoOperativo;
    const actualizado = await prisma_1.default.carro.update({
        where: { id },
        data: { estadoOperativo: estado },
    });
    return { carro: enriquecerCarro(actualizado), estadoAnterior, motivo, fechaEfectiva };
};
exports.cambiarEstadoOperativo = cambiarEstadoOperativo;
