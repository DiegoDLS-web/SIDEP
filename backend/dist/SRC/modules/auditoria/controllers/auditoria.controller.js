"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportarAuditoria = exports.getAuditoria = void 0;
const auditoriaService = __importStar(require("../services/auditoria.service"));
const getAuditoria = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const pageSize = parseInt(req.query.pageSize, 10) || 20;
        const rut = req.query.rut;
        const accion = req.query.accion;
        const entidad = req.query.entidad;
        const desde = req.query.desde;
        const hasta = req.query.hasta;
        const data = await auditoriaService.listarAuditoria({
            page,
            pageSize,
            rut,
            accion,
            entidad,
            desde,
            hasta,
        });
        return res.status(200).json(data);
    }
    catch (error) {
        console.error('🔥 ERROR AL LISTAR AUDITORIA:', error);
        return res.status(500).json({ success: false, error: error.message || 'Error al obtener auditoría' });
    }
};
exports.getAuditoria = getAuditoria;
const exportarAuditoria = async (req, res) => {
    try {
        const rut = req.query.rut;
        const accion = req.query.accion;
        const entidad = req.query.entidad;
        const desde = req.query.desde;
        const hasta = req.query.hasta;
        const buffer = await auditoriaService.exportarAuditoriaExcel({
            rut,
            accion,
            entidad,
            desde,
            hasta,
        });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=auditoria_sidep.xlsx');
        return res.status(200).send(buffer);
    }
    catch (error) {
        console.error('🔥 ERROR AL EXPORTAR AUDITORIA:', error);
        return res.status(500).json({ success: false, error: error.message || 'Error al exportar auditoría' });
    }
};
exports.exportarAuditoria = exportarAuditoria;
