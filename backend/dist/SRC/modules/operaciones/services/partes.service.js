"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.anularParte = exports.actualizarParte = exports.obtenerMetricas = exports.listarPagina = exports.obtenerPorId = exports.obtenerTodos = exports.crearParteConRelaciones = void 0;
exports.mapParteToDto = mapParteToDto;
const uuid_1 = require("uuid");
const prisma_1 = __importDefault(require("../../../prisma"));
const rut_util_1 = require("../../../utils/rut.util");
const AppError_1 = require("../../../utils/errors/AppError");
const parte_disponibilidad_util_1 = require("../../../utils/parte-disponibilidad.util");
const parte_edicion_roles_util_1 = require("../../../utils/parte-edicion-roles.util");
const notificaciones_scheduler_service_1 = require("../../notificaciones/notificaciones-scheduler.service");
const OPCIONES_TRANSACCION = { maxWait: 10_000, timeout: 60_000 };
function esEstadoParteFlexible(estado) {
    const codigo = String(estado || '').trim().toUpperCase();
    return codigo === 'BORRADOR' || codigo === 'PENDIENTE';
}
function codigoTriagePaciente(triage) {
    if (typeof triage === 'string' && triage.trim())
        return triage.trim().toUpperCase();
    if (triage && typeof triage === 'object') {
        const t = triage;
        return String(t.codigo || t.nombre || 'VERDE').trim().toUpperCase();
    }
    return 'VERDE';
}
const parteInclude = {
    clave: true,
    estado: true,
    obac: {
        select: {
            nombres: true,
            apellidoPaterno: true,
            apellidoMaterno: true,
            rut: true,
        },
    },
    unidades: {
        include: {
            carro: { select: { id: true, nomenclatura: true, nombre: true } },
            conductor: { select: { nombres: true, apellidoPaterno: true, rut: true } },
        },
    },
    asistencias: {
        include: {
            usuario: { select: { nombres: true, apellidoPaterno: true, rut: true } },
        },
    },
    vehiculosCiviles: true,
    pacientes: { include: { triage: true } },
    _count: { select: { asistencias: true, unidades: true } },
};
/** Consulta liviana para listados paginados (sin asistencias, pacientes ni metadata pesada). */
const parteIncludeListado = {
    clave: { select: { codigo: true, nombre: true } },
    estado: { select: { codigo: true, nombre: true } },
    obac: {
        select: {
            nombres: true,
            apellidoPaterno: true,
            apellidoMaterno: true,
            rut: true,
        },
    },
    unidades: {
        include: {
            carro: { select: { id: true, nomenclatura: true, nombre: true } },
        },
    },
};
const estadoIdCache = new Map();
const claveIdCache = new Map();
function mapearPacientesDto(pacientes, metadata) {
    const metaPacientes = Array.isArray(metadata?.pacientes)
        ? metadata.pacientes
        : [];
    return (pacientes ?? []).map((pac, idx) => {
        const metaPac = metaPacientes[idx] ?? metaPacientes.find((m) => String(m.nombre ?? '') === pac.nombre);
        const edadRaw = metaPac?.edad;
        return {
            id: pac.id,
            nombre: pac.nombre,
            rut: pac.rutPaciente,
            rutPaciente: pac.rutPaciente,
            triage: codigoTriagePaciente(pac.triage),
            triageId: pac.triageId,
            edad: edadRaw != null && edadRaw !== '' ? Number(edadRaw) : null,
        };
    });
}
function mapearVehiculosDto(vehiculos, metadata) {
    const metaVeh = Array.isArray(metadata?.vehiculos)
        ? metadata.vehiculos
        : [];
    return (vehiculos ?? []).map((v, idx) => {
        const metaRow = metaVeh[idx] ?? metaVeh.find((m) => String(m.patente ?? '') === (v.patente ?? '')) ?? {};
        return {
            id: v.id,
            patente: v.patente,
            marca: v.marca,
            tipo: typeof metaRow.tipo === 'string' ? metaRow.tipo : '',
            conductor: v.conductor,
            rut: v.rutConductor,
            rutConductor: v.rutConductor,
        };
    });
}
function parseMetadata(raw) {
    if (!raw)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function combinarFechaHora(fechaBase, horaStr) {
    const m = (horaStr || '').trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m)
        return fechaBase;
    const d = new Date(fechaBase);
    d.setHours(parseInt(m[1] ?? '0', 10), parseInt(m[2] ?? '0', 10), 0, 0);
    return d;
}
function extraerHoraHHmm(valor) {
    if (!valor)
        return undefined;
    if (typeof valor === 'string') {
        const t = valor.trim();
        if (/^\d{1,2}:\d{2}$/.test(t))
            return t;
        const m = t.match(/T(\d{2}):(\d{2})/);
        if (m)
            return `${m[1]}:${m[2]}`;
    }
    const d = new Date(valor);
    if (Number.isNaN(d.getTime()))
        return undefined;
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
/** Excluye partes anulados (no confundir con COMPLETADO, que suele ser id 3). */
const whereExcluirAnulados = {
    NOT: { estado: { codigo: 'ANULADO' } },
};
function construirUnidadesHorariosMetadata(unidades) {
    if (!Array.isArray(unidades))
        return undefined;
    const map = {};
    for (const raw of unidades) {
        const carroId = String(raw.carroId || '').trim();
        if (!carroId)
            continue;
        const hora6_0 = extraerHoraHHmm(String(raw.hora6_0 || raw.horaSalida || ''));
        const hora6_3 = extraerHoraHHmm(String(raw.hora6_3 || ''));
        const hora6_9 = extraerHoraHHmm(String(raw.hora6_9 || ''));
        const hora6_10 = extraerHoraHHmm(String(raw.hora6_10 || raw.horaLlegada || ''));
        if (hora6_0 || hora6_3 || hora6_9 || hora6_10) {
            map[carroId] = {
                ...(hora6_0 ? { hora6_0 } : {}),
                ...(hora6_3 ? { hora6_3 } : {}),
                ...(hora6_9 ? { hora6_9 } : {}),
                ...(hora6_10 ? { hora6_10 } : {}),
            };
        }
    }
    return Object.keys(map).length > 0 ? map : undefined;
}
async function resolverEstadoId(estado) {
    const codigo = (estado || 'PENDIENTE').trim().toUpperCase();
    const cached = estadoIdCache.get(codigo);
    if (cached != null)
        return cached;
    const encontrado = await prisma_1.default.catalogoEstadoParte.findFirst({
        where: {
            OR: [{ codigo }, { nombre: { equals: codigo, mode: 'insensitive' } }],
            activo: 1,
        },
    });
    const id = encontrado?.id ?? 1;
    estadoIdCache.set(codigo, id);
    return id;
}
async function resolverClaveId(claveEmergencia, claveId) {
    if (claveId && Number.isFinite(claveId))
        return Number(claveId);
    const codigo = (claveEmergencia || '10-9').trim();
    if (!codigo) {
        const fallback = await prisma_1.default.catalogoClaveEmergencia.findFirst({ where: { activo: 1 } });
        if (!fallback)
            throw new Error('No hay claves de emergencia activas en catálogo');
        return fallback.id;
    }
    const cached = claveIdCache.get(codigo);
    if (cached != null)
        return cached;
    const existente = await prisma_1.default.catalogoClaveEmergencia.findFirst({
        where: { codigo, activo: 1 },
    });
    if (existente) {
        claveIdCache.set(codigo, existente.id);
        return existente.id;
    }
    const creada = await prisma_1.default.catalogoClaveEmergencia.create({
        data: {
            codigo,
            nombre: codigo.length > 100 ? codigo.slice(0, 100) : codigo,
            activo: 1,
        },
    });
    claveIdCache.set(codigo, creada.id);
    return creada.id;
}
function normalizarRutBusqueda(rut) {
    return rut.replace(/[^0-9kK]/g, '').toUpperCase();
}
/** Solo devuelve RUT si cabe en VarChar(20); nombres/claves se resuelven o quedan solo en metadata. */
async function resolverConductorRutFk(tx, valor) {
    if (!valor?.trim())
        return null;
    const t = valor.trim();
    const directo = await tx.usuario.findUnique({ where: { rut: t } });
    if (directo?.rut && directo.rut.length <= 20)
        return directo.rut;
    const porClave = await tx.usuario.findFirst({ where: { claveNomina: t, activo: 1 } });
    if (porClave?.rut && porClave.rut.length <= 20)
        return porClave.rut;
    const norm = normalizarRutBusqueda(t);
    if (norm.length >= 7) {
        const formateado = (0, rut_util_1.formatearRutDesdeNormalizado)(norm);
        if (formateado) {
            const porFormato = await tx.usuario.findUnique({ where: { rut: formateado }, select: { rut: true } });
            if (porFormato?.rut && porFormato.rut.length <= 20)
                return porFormato.rut;
        }
        const porNorm = await tx.usuario.findFirst({
            where: { activo: 1, rut: { contains: norm.slice(-4) } },
            select: { rut: true },
        });
        if (porNorm?.rut && normalizarRutBusqueda(porNorm.rut) === norm && porNorm.rut.length <= 20) {
            return porNorm.rut;
        }
    }
    const partesNombre = t.split(/\s+/).filter(Boolean);
    if (partesNombre.length >= 2) {
        const primer = partesNombre[0];
        const segundo = partesNombre[1];
        const porNombre = await tx.usuario.findFirst({
            where: {
                nombres: { contains: primer, mode: 'insensitive' },
                apellidoPaterno: { contains: segundo, mode: 'insensitive' },
                activo: 1,
            },
            select: { rut: true },
        });
        if (porNombre?.rut && porNombre.rut.length <= 20)
            return porNombre.rut;
    }
    return null;
}
function extraerRutsAsistencia(data) {
    const ruts = new Set();
    if (Array.isArray(data.asistencias)) {
        for (const a of data.asistencias) {
            const rut = String(a.usuarioRut || a.rut || '').trim();
            if (rut)
                ruts.add(rut);
        }
    }
    const meta = (data.metadata && typeof data.metadata === 'object'
        ? data.metadata
        : {});
    const asis = (meta.asistencia || data.asistencia);
    const apc = asis?.asistenciaPorContexto;
    if (apc && typeof apc === 'object') {
        for (const ctx of Object.values(apc)) {
            if (!ctx || typeof ctx !== 'object')
                continue;
            for (const [id, mark] of Object.entries(ctx)) {
                if (mark && id.startsWith('usr-')) {
                    const rut = id.slice(4).trim();
                    if (rut)
                        ruts.add(rut);
                }
            }
        }
    }
    return [...ruts];
}
async function prepararFilasAsistencia(parteId, data, fechaReferencia, opciones) {
    const validar = opciones?.validarDisponibilidad !== false;
    const ruts = extraerRutsAsistencia(data);
    const filas = [];
    for (const candidato of ruts) {
        const rutFinal = await resolverConductorRutFk(prisma_1.default, candidato);
        if (!rutFinal)
            continue;
        if (validar) {
            try {
                await (0, parte_disponibilidad_util_1.assertVoluntarioPuedeParticiparEnParte)(prisma_1.default, rutFinal, fechaReferencia, 'asistencia');
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : 'Voluntario no disponible para asistencia.';
                throw new AppError_1.ValidationError([msg]);
            }
        }
        filas.push({ id: (0, uuid_1.v4)(), parteId, usuarioRut: rutFinal });
    }
    return filas;
}
async function sincronizarAsistencias(tx, parteId, filas) {
    await tx.asistenciaPersonal.deleteMany({ where: { parteId } });
    if (filas.length > 0) {
        await tx.asistenciaPersonal.createMany({ data: filas });
    }
}
async function resolverObacRut(data) {
    const candidato = String(data.obacRut || data.obacId || '').trim();
    if (!candidato)
        throw new Error('OBAC es obligatorio');
    const porRut = await prisma_1.default.usuario.findUnique({ where: { rut: candidato } });
    if (porRut)
        return porRut.rut;
    const porClave = await prisma_1.default.usuario.findFirst({
        where: { claveNomina: candidato, activo: 1 },
    });
    if (porClave)
        return porClave.rut;
    const norm = normalizarRutBusqueda(candidato);
    if (norm.length >= 7) {
        const candidatos = await prisma_1.default.usuario.findMany({
            where: { activo: 1 },
            select: { rut: true },
        });
        const exacto = candidatos.find((u) => normalizarRutBusqueda(u.rut) === norm);
        if (exacto)
            return exacto.rut;
    }
    const porRutParcial = await prisma_1.default.usuario.findFirst({
        where: {
            OR: [
                { rut: { contains: candidato } },
                { nombres: { contains: candidato, mode: 'insensitive' } },
                { claveNomina: { contains: candidato, mode: 'insensitive' } },
            ],
            activo: 1,
        },
    });
    if (porRutParcial)
        return porRutParcial.rut;
    throw new Error(`OBAC "${candidato}" no encontrado`);
}
async function resolverTriageId(triage) {
    const codigo = (triage || 'VERDE').trim().toUpperCase();
    const encontrado = await prisma_1.default.catalogoTriage.findFirst({
        where: { OR: [{ codigo }, { nombre: { equals: codigo, mode: 'insensitive' } }] },
    });
    return encontrado?.id ?? 1;
}
function generarCorrelativo() {
    const ahora = new Date();
    const y = ahora.getFullYear();
    const m = `${ahora.getMonth() + 1}`.padStart(2, '0');
    const d = `${ahora.getDate()}`.padStart(2, '0');
    const suf = `${ahora.getTime()}`.slice(-6);
    return `P-${y}${m}${d}-${suf}`;
}
function construirMetadataPersistencia(data) {
    const base = (data.metadata && typeof data.metadata === 'object'
        ? { ...data.metadata }
        : {});
    const campos = [
        'claveEmergencia',
        'descripcionEmergencia',
        'trabajoRealizado',
        'materialUtilizado',
        'observaciones',
        'horaDelLlamado',
        'vehiculos',
        'apoyoExterno',
        'otrasCompanias',
        'asistencia',
        'conductoresPorCarroId',
        'motivoPendiente',
    ];
    if (data.claveEmergencia !== undefined && data.claveEmergencia !== null) {
        base.claveEmergencia = String(data.claveEmergencia).trim() || null;
    }
    for (const campo of campos) {
        if (data[campo] !== undefined && data[campo] !== null) {
            base[campo] = data[campo];
        }
    }
    if (data.vehiculosAfectados)
        base.vehiculos = data.vehiculosAfectados;
    if (data.apoyosExternos)
        base.apoyoExterno = data.apoyosExternos;
    if (data.pacientes)
        base.pacientes = data.pacientes;
    const horarios = construirUnidadesHorariosMetadata(data.unidades);
    if (horarios)
        base.unidadesHorarios = horarios;
    return Object.keys(base).length > 0 ? JSON.stringify(base) : null;
}
function mapParteToDto(p) {
    if (!p)
        return null;
    const metadata = parseMetadata(p.metadata);
    const estadoCodigo = (p.estado?.codigo || p.estado?.nombre || 'PENDIENTE').toUpperCase();
    const nombreObac = p.obac
        ? `${p.obac.nombres} ${p.obac.apellidoPaterno}`.trim()
        : undefined;
    return {
        id: p.id,
        correlativo: p.correlativo,
        direccion: p.direccion,
        estadoId: p.estadoId,
        claveId: p.claveId,
        obacRut: p.obacRut,
        obacId: p.obacRut,
        fechaEmergencia: p.fechaEmergencia,
        fecha: p.fechaEmergencia,
        referenciaLugar: p.referenciaLugar,
        trabajoRealizado: p.trabajoRealizado ?? metadata?.trabajoRealizado,
        materialUtilizado: p.materialUtilizado ?? metadata?.materialUtilizado,
        metadata,
        descripcionEmergencia: metadata?.descripcionEmergencia,
        observaciones: metadata?.observaciones,
        motivoPendiente: typeof metadata?.motivoPendiente === 'string' && metadata.motivoPendiente.trim()
            ? metadata.motivoPendiente.trim()
            : undefined,
        claveEmergencia: (typeof metadata?.claveEmergencia === 'string' && metadata.claveEmergencia.trim()
            ? metadata.claveEmergencia.trim()
            : undefined) ?? p.clave?.codigo,
        codigoEmergencia: (typeof metadata?.claveEmergencia === 'string' && metadata.claveEmergencia.trim()
            ? metadata.claveEmergencia.trim()
            : undefined) ?? p.clave?.codigo,
        estado: estadoCodigo,
        clave: p.clave,
        obac: p.obac
            ? { ...p.obac, nombre: nombreObac }
            : undefined,
        unidades: p.unidades?.map((u) => {
            const horarios = metadata?.unidadesHorarios?.[u.carroId];
            const hora6_0 = horarios?.hora6_0 ?? extraerHoraHHmm(u.horaSalida);
            const hora6_10 = horarios?.hora6_10 ?? extraerHoraHHmm(u.horaLlegada);
            return {
                id: u.id,
                carroId: u.carroId,
                conductorRut: u.conductorRut,
                horaSalida: u.horaSalida,
                horaLlegada: u.horaLlegada,
                hora6_0: hora6_0,
                hora6_3: horarios?.hora6_3 ?? hora6_0,
                hora6_9: horarios?.hora6_9,
                hora6_10: hora6_10,
                kmSalida: Number(u.kmSalida),
                kmLlegada: Number(u.kmLlegada),
                carro: u.carro,
                conductor: u.conductor,
            };
        }),
        carrosAsistentes: p.unidades,
        asistencias: p.asistencias,
        vehiculosAfectados: mapearVehiculosDto(p.vehiculosCiviles, metadata),
        pacientes: mapearPacientesDto(p.pacientes, metadata),
        apoyosExternos: metadata?.apoyoExterno ?? [],
        otrasCompanias: metadata?.otrasCompanias ?? [],
        _count: p._count,
        createdAt: p.createdAt,
    };
}
function mapParteListadoToDto(p) {
    const metadata = parseMetadata(p.metadata);
    const estadoCodigo = (p.estado?.codigo || p.estado?.nombre || 'PENDIENTE').toUpperCase();
    const nombreObac = p.obac
        ? `${p.obac.nombres} ${p.obac.apellidoPaterno}`.trim()
        : undefined;
    const claveMeta = typeof metadata?.claveEmergencia === 'string' && metadata.claveEmergencia.trim()
        ? metadata.claveEmergencia.trim()
        : undefined;
    const motivoPendiente = typeof metadata?.motivoPendiente === 'string' && metadata.motivoPendiente.trim()
        ? metadata.motivoPendiente.trim()
        : undefined;
    return {
        id: p.id,
        correlativo: p.correlativo,
        direccion: p.direccion,
        estadoId: p.estadoId,
        claveId: p.claveId,
        obacRut: p.obacRut,
        obacId: p.obacRut,
        fechaEmergencia: p.fechaEmergencia,
        fecha: p.fechaEmergencia,
        metadata: claveMeta || motivoPendiente ? { ...(claveMeta ? { claveEmergencia: claveMeta } : {}), ...(motivoPendiente ? { motivoPendiente } : {}) } : null,
        motivoPendiente,
        claveEmergencia: claveMeta ?? p.clave?.codigo,
        codigoEmergencia: claveMeta ?? p.clave?.codigo,
        estado: estadoCodigo,
        clave: p.clave,
        obac: p.obac ? { ...p.obac, nombre: nombreObac } : undefined,
        unidades: p.unidades?.map((u) => ({
            id: u.id,
            carroId: u.carroId,
            carro: u.carro,
        })),
    };
}
async function prepararFilasUnidades(parteId, unidades, fechaBase, conductoresPorCarroId, opciones) {
    if (!Array.isArray(unidades) || unidades.length === 0)
        return [];
    const validar = opciones?.validarDisponibilidad !== false;
    const data = [];
    for (const u of unidades) {
        const carroId = String(u.carroId || '').trim();
        if (!carroId)
            continue;
        if (validar) {
            const disponibilidad = await (0, parte_disponibilidad_util_1.evaluarCarroDisponibleParaParte)(prisma_1.default, carroId, fechaBase);
            if (!disponibilidad.disponible) {
                const nom = disponibilidad.nomenclatura ?? carroId;
                throw new AppError_1.ValidationError([
                    `La unidad ${nom} no puede despacharse en la fecha del parte: está ${disponibilidad.motivo ?? 'no operativa'}.`,
                ]);
            }
        }
        const rawConductor = u.conductorRut
            || conductoresPorCarroId?.[carroId]
            || undefined;
        const conductorRut = await resolverConductorRutFk(prisma_1.default, rawConductor);
        if (conductorRut && validar) {
            try {
                await (0, parte_disponibilidad_util_1.assertVoluntarioPuedeParticiparEnParte)(prisma_1.default, conductorRut, fechaBase, 'conductor');
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : 'Conductor no disponible.';
                throw new AppError_1.ValidationError([msg]);
            }
        }
        data.push({
            id: (0, uuid_1.v4)(),
            parteId,
            carroId,
            conductorRut,
            horaSalida: combinarFechaHora(fechaBase, String(u.horaSalida || u.hora6_0 || '00:00')),
            horaLlegada: combinarFechaHora(fechaBase, String(u.horaLlegada || u.hora6_10 || '00:00')),
            kmSalida: Number(u.kmSalida) || 0,
            kmLlegada: Number(u.kmLlegada) || 0,
        });
    }
    return data;
}
async function sincronizarUnidades(tx, parteId, filas) {
    await tx.unidadEnEmergencia.deleteMany({ where: { parteId } });
    if (filas.length > 0) {
        await tx.unidadEnEmergencia.createMany({ data: filas });
    }
}
async function sincronizarVehiculos(tx, parteId, vehiculos) {
    await tx.vehiculoCivilEmergencia.deleteMany({ where: { parteId } });
    if (!Array.isArray(vehiculos) || vehiculos.length === 0)
        return;
    const data = [];
    for (const v of vehiculos) {
        data.push({
            id: (0, uuid_1.v4)(),
            parteId,
            patente: String(v.patente || '').trim() || null,
            marca: String(v.marca || v.tipo || '').trim() || null,
            conductor: String(v.conductor || v.nombre || '').trim() || null,
            rutConductor: String(v.rutConductor || v.rut || '').trim() || null,
        });
    }
    if (data.length > 0) {
        await tx.vehiculoCivilEmergencia.createMany({ data });
    }
}
async function prepararFilasPacientes(parteId, pacientes) {
    if (!Array.isArray(pacientes) || pacientes.length === 0)
        return [];
    const data = [];
    for (const pac of pacientes) {
        const nombre = String(pac.nombre || '').trim();
        if (!nombre)
            continue;
        const triageId = await resolverTriageId(String(pac.triage || 'VERDE'));
        data.push({
            id: (0, uuid_1.v4)(),
            parteId,
            nombre,
            rutPaciente: pac.rut ? String(pac.rut) : null,
            triageId,
        });
    }
    return data;
}
async function sincronizarPacientes(tx, parteId, filas) {
    await tx.pacienteEmergencia.deleteMany({ where: { parteId } });
    if (filas.length > 0) {
        await tx.pacienteEmergencia.createMany({ data: filas });
    }
}
const crearParteConRelaciones = async (data) => {
    const estadoId = await resolverEstadoId(String(data.estado || ''));
    const claveId = await resolverClaveId(data.claveEmergencia, data.claveId);
    const obacRut = await resolverObacRut(data);
    const correlativo = String(data.correlativo || generarCorrelativo());
    const fechaEmergencia = data.fecha || data.fechaEmergencia
        ? new Date(String(data.fecha || data.fechaEmergencia))
        : new Date();
    const metadataStr = construirMetadataPersistencia(data);
    const conductores = data.metadata?.conductoresPorCarroId;
    const parteId = (0, uuid_1.v4)();
    const flexible = esEstadoParteFlexible(data.estado);
    const opcionesDisponibilidad = { validarDisponibilidad: !flexible };
    if (!flexible) {
        await (0, parte_disponibilidad_util_1.assertVoluntarioPuedeParticiparEnParte)(prisma_1.default, obacRut, fechaEmergencia, 'OBAC');
    }
    const [filasAsistencia, filasUnidades, filasPacientes] = await Promise.all([
        prepararFilasAsistencia(parteId, data, fechaEmergencia, opcionesDisponibilidad),
        prepararFilasUnidades(parteId, data.unidades, fechaEmergencia, conductores, opcionesDisponibilidad),
        prepararFilasPacientes(parteId, data.pacientes),
    ]);
    await prisma_1.default.$transaction(async (tx) => {
        await tx.parteEmergencia.create({
            data: {
                id: parteId,
                correlativo,
                estadoId,
                fechaEmergencia,
                claveId,
                obacRut,
                direccion: String(data.direccion || '—'),
                referenciaLugar: data.referenciaLugar ? String(data.referenciaLugar) : null,
                trabajoRealizado: data.trabajoRealizado ? String(data.trabajoRealizado) : null,
                materialUtilizado: data.materialUtilizado ? String(data.materialUtilizado) : null,
                metadata: metadataStr,
            },
        });
        await sincronizarAsistencias(tx, parteId, filasAsistencia);
        await sincronizarUnidades(tx, parteId, filasUnidades);
        await sincronizarVehiculos(tx, parteId, (data.vehiculosAfectados || data.vehiculosCiviles));
        await sincronizarPacientes(tx, parteId, filasPacientes);
    }, OPCIONES_TRANSACCION);
    const creado = await (0, exports.obtenerPorId)(parteId);
    const estadoCodigo = String(data.estado || creado?.estado || '').trim().toUpperCase();
    if (estadoCodigo && estadoCodigo !== 'PENDIENTE' && estadoCodigo !== 'BORRADOR') {
        void (0, notificaciones_scheduler_service_1.notificarNuevaEmergencia)({
            correlativo: creado?.correlativo ?? correlativo,
            direccion: creado?.direccion ?? String(data.direccion || ''),
            claveEmergencia: creado?.claveEmergencia ?? String(data.claveEmergencia || ''),
        }).catch(() => undefined);
    }
    return creado;
};
exports.crearParteConRelaciones = crearParteConRelaciones;
const obtenerTodos = async () => {
    const partes = await prisma_1.default.parteEmergencia.findMany({
        where: whereExcluirAnulados,
        include: parteInclude,
        orderBy: { fechaEmergencia: 'desc' },
    });
    return partes.map((p) => mapParteToDto(p));
};
exports.obtenerTodos = obtenerTodos;
const obtenerPorId = async (id) => {
    const parte = await prisma_1.default.parteEmergencia.findUnique({
        where: { id },
        include: parteInclude,
    });
    return mapParteToDto(parte);
};
exports.obtenerPorId = obtenerPorId;
function construirWhereListado(filtros) {
    const where = { ...whereExcluirAnulados };
    if (filtros.q?.trim()) {
        where.direccion = { contains: filtros.q.trim(), mode: 'insensitive' };
    }
    if (filtros.desde || filtros.hasta) {
        where.fechaEmergencia = {};
        if (filtros.desde)
            where.fechaEmergencia.gte = new Date(filtros.desde);
        if (filtros.hasta) {
            const hasta = new Date(filtros.hasta);
            hasta.setHours(23, 59, 59, 999);
            where.fechaEmergencia.lte = hasta;
        }
    }
    if (filtros.estado?.trim()) {
        where.estado = {
            OR: [
                { codigo: filtros.estado.trim().toUpperCase() },
                { nombre: { equals: filtros.estado.trim(), mode: 'insensitive' } },
            ],
        };
    }
    if (filtros.tipos?.trim()) {
        const codigos = filtros.tipos.split(',').map((t) => t.trim()).filter(Boolean);
        if (codigos.length > 0) {
            where.clave = { codigo: { in: codigos } };
        }
    }
    if (filtros.carros?.trim()) {
        const carroIds = filtros.carros.split(',').map((c) => c.trim()).filter(Boolean);
        if (carroIds.length > 0) {
            where.unidades = { some: { carroId: { in: carroIds } } };
        }
    }
    if (filtros.persona?.trim()) {
        const persona = filtros.persona.trim();
        where.obac = {
            OR: [
                { rut: { contains: persona } },
                { nombres: { contains: persona, mode: 'insensitive' } },
                { apellidoPaterno: { contains: persona, mode: 'insensitive' } },
                { apellidoMaterno: { contains: persona, mode: 'insensitive' } },
            ],
        };
    }
    return where;
}
const listarPagina = async (filtros) => {
    const page = Math.max(1, Number(filtros.page) || 1);
    const pageSize = Math.min(2000, Math.max(1, Number(filtros.pageSize) || 10));
    const where = construirWhereListado(filtros);
    const [total, partes] = await Promise.all([
        prisma_1.default.parteEmergencia.count({ where }),
        prisma_1.default.parteEmergencia.findMany({
            where,
            include: parteIncludeListado,
            orderBy: { fechaEmergencia: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
    ]);
    return {
        items: partes.map((p) => mapParteListadoToDto(p)),
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
};
exports.listarPagina = listarPagina;
const obtenerMetricas = async () => {
    const ahora = new Date();
    const inicioAnio = new Date(ahora.getFullYear(), 0, 1);
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const baseWhere = whereExcluirAnulados;
    const [totalSistema, enAnioActual, enMesActual] = await Promise.all([
        prisma_1.default.parteEmergencia.count({ where: baseWhere }),
        prisma_1.default.parteEmergencia.count({
            where: { ...baseWhere, fechaEmergencia: { gte: inicioAnio } },
        }),
        prisma_1.default.parteEmergencia.count({
            where: { ...baseWhere, fechaEmergencia: { gte: inicioMes } },
        }),
    ]);
    return { totalSistema, enAnioActual, enMesActual };
};
exports.obtenerMetricas = obtenerMetricas;
const actualizarParte = async (id, data, rolActor) => {
    const existente = await prisma_1.default.parteEmergencia.findUnique({
        where: { id },
        include: { estado: { select: { codigo: true, nombre: true } } },
    });
    if (!existente)
        return null;
    const estadoActual = (existente.estado?.codigo || existente.estado?.nombre || '').toUpperCase();
    if (estadoActual === 'COMPLETADO' && !(0, parte_edicion_roles_util_1.puedeEditarParteCompletado)(rolActor)) {
        throw new AppError_1.ValidationError([
            'Solo capitán, tenientes o administrador pueden editar un parte completado.',
        ]);
    }
    const metadataActual = parseMetadata(existente.metadata) || {};
    const metadataNuevo = data.metadata && typeof data.metadata === 'object'
        ? { ...metadataActual, ...data.metadata }
        : { ...metadataActual };
    const metaEntrante = data.metadata;
    if (metaEntrante?.asistencia && typeof metaEntrante.asistencia === 'object') {
        const prev = metadataActual.asistencia && typeof metadataActual.asistencia === 'object'
            ? metadataActual.asistencia
            : {};
        metadataNuevo.asistencia = {
            ...prev,
            ...metaEntrante.asistencia,
        };
    }
    const camposMeta = [
        'claveEmergencia',
        'descripcionEmergencia',
        'trabajoRealizado',
        'materialUtilizado',
        'observaciones',
        'horaDelLlamado',
        'asistencia',
        'conductoresPorCarroId',
        'motivoPendiente',
    ];
    for (const campo of camposMeta) {
        if (data[campo] !== undefined)
            metadataNuevo[campo] = data[campo];
    }
    const estadoEntrante = data.estado !== undefined ? String(data.estado).trim().toUpperCase() : undefined;
    if (estadoEntrante === 'COMPLETADO') {
        metadataNuevo.motivoPendiente = null;
    }
    else if (estadoEntrante === 'PENDIENTE' && data.motivoPendiente !== undefined) {
        metadataNuevo.motivoPendiente = data.motivoPendiente ? String(data.motivoPendiente).trim() : null;
    }
    if (data.claveEmergencia !== undefined && data.claveEmergencia !== null) {
        metadataNuevo.claveEmergencia = String(data.claveEmergencia).trim() || null;
    }
    if (data.vehiculosAfectados)
        metadataNuevo.vehiculos = data.vehiculosAfectados;
    if (data.apoyosExternos)
        metadataNuevo.apoyoExterno = data.apoyosExternos;
    if (data.otrasCompanias !== undefined)
        metadataNuevo.otrasCompanias = data.otrasCompanias;
    if (data.pacientes !== undefined)
        metadataNuevo.pacientes = data.pacientes;
    const horariosUnidades = construirUnidadesHorariosMetadata(data.unidades);
    if (horariosUnidades) {
        metadataNuevo.unidadesHorarios = horariosUnidades;
    }
    else if (metaEntrante?.unidadesHorarios) {
        metadataNuevo.unidadesHorarios = metaEntrante.unidadesHorarios;
    }
    const updateData = {
        metadata: Object.keys(metadataNuevo).length > 0 ? JSON.stringify(metadataNuevo) : existente.metadata,
    };
    if (data.direccion !== undefined)
        updateData.direccion = String(data.direccion);
    if (data.referenciaLugar !== undefined)
        updateData.referenciaLugar = data.referenciaLugar ? String(data.referenciaLugar) : null;
    if (data.trabajoRealizado !== undefined)
        updateData.trabajoRealizado = data.trabajoRealizado ? String(data.trabajoRealizado) : null;
    if (data.materialUtilizado !== undefined)
        updateData.materialUtilizado = data.materialUtilizado ? String(data.materialUtilizado) : null;
    if (data.estado !== undefined) {
        updateData.estado = { connect: { id: await resolverEstadoId(String(data.estado)) } };
    }
    else if (data.estadoId !== undefined) {
        updateData.estado = { connect: { id: Number(data.estadoId) } };
    }
    if (data.claveEmergencia !== undefined || data.claveId !== undefined) {
        const claveId = await resolverClaveId(data.claveEmergencia, data.claveId);
        updateData.clave = { connect: { id: claveId } };
    }
    if (data.fecha !== undefined || data.fechaEmergencia !== undefined) {
        updateData.fechaEmergencia = new Date(String(data.fecha || data.fechaEmergencia));
    }
    if (data.obacId !== undefined || data.obacRut !== undefined) {
        const obacRut = await resolverObacRut(data);
        if (obacRut !== existente.obacRut) {
            updateData.obac = { connect: { rut: obacRut } };
        }
    }
    const fechaBase = data.fecha || data.fechaEmergencia
        ? new Date(String(data.fecha || data.fechaEmergencia))
        : existente.fechaEmergencia;
    const obacRutValidar = data.obacId !== undefined || data.obacRut !== undefined
        ? await resolverObacRut(data)
        : existente.obacRut;
    const estadoParaReglas = estadoEntrante ?? estadoActual;
    const flexible = esEstadoParteFlexible(estadoParaReglas);
    const opcionesDisponibilidad = { validarDisponibilidad: !flexible };
    if (!flexible) {
        await (0, parte_disponibilidad_util_1.assertVoluntarioPuedeParticiparEnParte)(prisma_1.default, obacRutValidar, fechaBase, 'OBAC');
    }
    const conductores = metadataNuevo.conductoresPorCarroId;
    const dataSync = { ...data, metadata: metadataNuevo };
    const filasAsistencia = await prepararFilasAsistencia(id, dataSync, fechaBase, opcionesDisponibilidad);
    const filasUnidades = data.unidades !== undefined
        ? await prepararFilasUnidades(id, data.unidades, fechaBase, conductores, opcionesDisponibilidad)
        : null;
    const filasPacientes = data.pacientes !== undefined
        ? await prepararFilasPacientes(id, data.pacientes)
        : null;
    await prisma_1.default.$transaction(async (tx) => {
        await tx.parteEmergencia.update({ where: { id }, data: updateData });
        if (filasUnidades !== null) {
            await sincronizarUnidades(tx, id, filasUnidades);
        }
        if (data.vehiculosAfectados !== undefined || data.vehiculosCiviles !== undefined) {
            await sincronizarVehiculos(tx, id, (data.vehiculosAfectados || data.vehiculosCiviles));
        }
        if (filasPacientes !== null) {
            await sincronizarPacientes(tx, id, filasPacientes);
        }
        await sincronizarAsistencias(tx, id, filasAsistencia);
    }, OPCIONES_TRANSACCION);
    return (0, exports.obtenerPorId)(id);
};
exports.actualizarParte = actualizarParte;
const anularParte = async (id) => {
    const anuladoId = await resolverEstadoId('ANULADO');
    await prisma_1.default.parteEmergencia.update({
        where: { id },
        data: { estadoId: anuladoId },
    });
    return true;
};
exports.anularParte = anularParte;
