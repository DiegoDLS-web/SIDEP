"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.actualizarTiposEmergenciaService = exports.actualizarLogoCompania = exports.actualizarConfiguracionesService = exports.obtenerConfiguracionOperativaService = exports.obtenerConfiguracionesService = exports.getDbConfiguracion = void 0;
exports.mapConfiguracionToDto = mapConfiguracionToDto;
exports.mapConfiguracionOperativaToDto = mapConfiguracionOperativaToDto;
const prisma_1 = __importDefault(require("../../../prisma"));
const storage_1 = require("../../../shared/storage");
function mapConfiguracionToDto(config) {
    let navegacion = undefined;
    if (config.navegacionPorRol) {
        try {
            navegacion = JSON.parse(config.navegacionPorRol);
        }
        catch (e) { }
    }
    let tipos = undefined;
    if (config.tiposEmergencia) {
        try {
            tipos = JSON.parse(config.tiposEmergencia);
        }
        catch (e) { }
    }
    return {
        compania: {
            nombreCompania: config.nombreCompania || '',
            nombreBomba: config.nombreBomba || '',
            direccion: config.direccion || '',
            telefono: config.telefono || '',
            emailInstitucional: config.emailInstitucional || '',
            fechaFundacion: config.fechaFundacion ? config.fechaFundacion.toISOString().split('T')[0] : ''
        },
        notificaciones: {
            alertasEmergencia: config.alertasEmergencia === 1,
            alertasInventario: config.alertasInventario === 1,
            recordatoriosChecklist: config.recordatoriosChecklist === 1,
            resumenDiarioEmail: config.resumenDiarioEmail === 1,
        },
        reportes: {
            formatoPredeterminado: config.formatoPredeterminado || 'PDF',
            logosPdf: config.logosPdf || 'AMBOS',
            orientacionPdf: config.orientacionPdf || 'VERTICAL'
        },
        navegacionPorRol: navegacion,
        tiposEmergencia: tipos
    };
}
/** Datos operativos sin navegación por rol ni preferencias de notificación (lectura para cualquier autenticado). */
function mapConfiguracionOperativaToDto(config) {
    let tipos = undefined;
    if (config.tiposEmergencia) {
        try {
            tipos = JSON.parse(config.tiposEmergencia);
        }
        catch (e) { }
    }
    return {
        compania: {
            nombreCompania: config.nombreCompania || '',
            nombreBomba: config.nombreBomba || '',
            direccion: config.direccion || '',
            telefono: config.telefono || '',
            emailInstitucional: config.emailInstitucional || '',
            fechaFundacion: config.fechaFundacion ? config.fechaFundacion.toISOString().split('T')[0] : '',
        },
        reportes: {
            formatoPredeterminado: config.formatoPredeterminado || 'PDF',
            logosPdf: config.logosPdf || 'AMBOS',
            orientacionPdf: config.orientacionPdf || 'VERTICAL',
        },
        tiposEmergencia: tipos,
    };
}
const getDbConfiguracion = async () => {
    let config = await prisma_1.default.configuracionSistema.findUnique({ where: { id: 1 } });
    if (!config) {
        config = await prisma_1.default.configuracionSistema.create({
            data: {
                id: 1,
                nombreCompania: '1ª Compañía Santa Juana',
            }
        });
    }
    return config;
};
exports.getDbConfiguracion = getDbConfiguracion;
const obtenerConfiguracionesService = async () => {
    const config = await (0, exports.getDbConfiguracion)();
    return mapConfiguracionToDto(config);
};
exports.obtenerConfiguracionesService = obtenerConfiguracionesService;
const obtenerConfiguracionOperativaService = async () => {
    const config = await (0, exports.getDbConfiguracion)();
    return mapConfiguracionOperativaToDto(config);
};
exports.obtenerConfiguracionOperativaService = obtenerConfiguracionOperativaService;
const actualizarConfiguracionesService = async (data) => {
    const config = await (0, exports.getDbConfiguracion)();
    const navegacionPorRolStr = data.navegacionPorRol ? JSON.stringify(data.navegacionPorRol) : null;
    let fechaFundacionDb = null;
    if (data.compania?.fechaFundacion) {
        fechaFundacionDb = new Date(data.compania.fechaFundacion);
    }
    const configActualizada = await prisma_1.default.configuracionSistema.update({
        where: { id: 1 },
        data: {
            nombreCompania: data.compania?.nombreCompania || config.nombreCompania,
            nombreBomba: data.compania?.nombreBomba || null,
            direccion: data.compania?.direccion || null,
            telefono: data.compania?.telefono || null,
            emailInstitucional: data.compania?.emailInstitucional || null,
            fechaFundacion: fechaFundacionDb,
            alertasEmergencia: data.notificaciones?.alertasEmergencia ? 1 : 0,
            alertasInventario: data.notificaciones?.alertasInventario ? 1 : 0,
            recordatoriosChecklist: data.notificaciones?.recordatoriosChecklist ? 1 : 0,
            resumenDiarioEmail: data.notificaciones?.resumenDiarioEmail ? 1 : 0,
            formatoPredeterminado: data.reportes?.formatoPredeterminado || 'PDF',
            logosPdf: data.reportes?.logosPdf || 'AMBOS',
            orientacionPdf: data.reportes?.orientacionPdf || 'VERTICAL',
            navegacionPorRol: navegacionPorRolStr !== null ? navegacionPorRolStr : config.navegacionPorRol
        }
    });
    return mapConfiguracionToDto(configActualizada);
};
exports.actualizarConfiguracionesService = actualizarConfiguracionesService;
const actualizarLogoCompania = async (nuevaUrl, nuevoPublicId) => {
    const config = await (0, exports.getDbConfiguracion)();
    if (config.logoPublicId) {
        await storage_1.StorageService.deleteFile(config.logoPublicId);
    }
    await prisma_1.default.configuracionSistema.update({
        where: { id: 1 },
        data: {
            logoUrl: nuevaUrl,
            logoPublicId: nuevoPublicId,
        }
    });
    return nuevaUrl;
};
exports.actualizarLogoCompania = actualizarLogoCompania;
const actualizarTiposEmergenciaService = async (tiposEmergencia) => {
    await (0, exports.getDbConfiguracion)();
    const tiposStr = JSON.stringify(tiposEmergencia || []);
    const configActualizada = await prisma_1.default.configuracionSistema.update({
        where: { id: 1 },
        data: { tiposEmergencia: tiposStr }
    });
    return mapConfiguracionToDto(configActualizada);
};
exports.actualizarTiposEmergenciaService = actualizarTiposEmergenciaService;
