"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildResumenOperativoUsuario = buildResumenOperativoUsuario;
const prisma_js_1 = require("./prisma.js");
const parte_asistencia_js_1 = require("./parte-asistencia.js");
async function buildResumenOperativoUsuario(usuarioId) {
    const ref = new Date();
    const anioReferencia = ref.getFullYear();
    const mesReferencia = ref.getMonth() + 1;
    const inicioAnio = new Date(anioReferencia, 0, 1);
    const finAnio = new Date(anioReferencia, 11, 31, 23, 59, 59, 999);
    const inicioMes = new Date(anioReferencia, mesReferencia - 1, 1);
    const finMes = new Date(anioReferencia, mesReferencia, 0, 23, 59, 59, 999);
    const [partes, licRows, licTotal] = await Promise.all([
        prisma_js_1.prisma.parteEmergencia.findMany({
            select: {
                id: true,
                correlativo: true,
                fecha: true,
                claveEmergencia: true,
                direccion: true,
                estado: true,
                metadata: true,
                obac: { select: { nombre: true } },
            },
            orderBy: { fecha: 'desc' },
        }),
        prisma_js_1.prisma.licenciaMedica.findMany({
            where: { usuarioId },
            select: {
                id: true,
                fechaInicio: true,
                fechaTermino: true,
                motivo: true,
                estado: true,
            },
            orderBy: { fechaInicio: 'desc' },
            take: 15,
        }),
        prisma_js_1.prisma.licenciaMedica.count({ where: { usuarioId } }),
    ]);
    let marcasRegistradasTotal = 0;
    let marcasRegistradasAnioActual = 0;
    let marcasRegistradasMesActual = 0;
    const distTotal = new Set();
    const distAnio = new Set();
    const distMes = new Set();
    for (const parte of partes) {
        const marcaciones = (0, parte_asistencia_js_1.extraerAsistenciasMetadata)(parte.metadata).filter((a) => a.usuarioId === usuarioId && a.presente);
        if (marcaciones.length === 0)
            continue;
        const f = new Date(parte.fecha);
        marcasRegistradasTotal += marcaciones.length;
        distTotal.add(parte.id);
        if (f >= inicioAnio && f <= finAnio) {
            marcasRegistradasAnioActual += marcaciones.length;
            distAnio.add(parte.id);
        }
        if (f >= inicioMes && f <= finMes) {
            marcasRegistradasMesActual += marcaciones.length;
            distMes.add(parte.id);
        }
    }
    const emergenciasRecientes = [];
    for (const parte of partes) {
        const marcaciones = (0, parte_asistencia_js_1.extraerAsistenciasMetadata)(parte.metadata).filter((a) => a.usuarioId === usuarioId && a.presente);
        if (marcaciones.length === 0)
            continue;
        emergenciasRecientes.push({
            id: parte.id,
            correlativo: parte.correlativo,
            fecha: parte.fecha.toISOString(),
            claveEmergencia: parte.claveEmergencia,
            direccion: parte.direccion,
            estado: parte.estado,
            obacNombre: parte.obac.nombre,
            marcasEnParte: marcaciones.length,
        });
        if (emergenciasRecientes.length >= 12)
            break;
    }
    return {
        asistencia: {
            marcasRegistradasTotal,
            emergenciasDistintasTotal: distTotal.size,
            marcasRegistradasAnioActual,
            emergenciasDistintasAnioActual: distAnio.size,
            marcasRegistradasMesActual,
            emergenciasDistintasMesActual: distMes.size,
            anioReferencia,
            mesReferencia,
        },
        licencias: {
            total: licTotal,
            items: licRows.map((r) => ({
                id: r.id,
                fechaInicio: r.fechaInicio.toISOString(),
                fechaTermino: r.fechaTermino.toISOString(),
                estado: r.estado,
                motivo: r.motivo,
            })),
        },
        emergenciasRecientes,
    };
}
//# sourceMappingURL=usuario-resumen-operativo.js.map