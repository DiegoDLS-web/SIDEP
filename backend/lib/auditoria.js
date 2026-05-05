"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registrarActividad = registrarActividad;
const prisma_js_1 = require("./prisma.js");
async function registrarActividad(input) {
    try {
        await prisma_js_1.prisma.actividadUsuario.create({
            data: {
                accion: input.accion,
                modulo: input.modulo,
                ...(input.usuarioId !== undefined ? { usuarioId: input.usuarioId } : {}),
                ...(input.referencia !== undefined ? { referencia: input.referencia } : {}),
                ...(input.detalle !== undefined ? { detalle: input.detalle } : {}),
            },
        });
    }
    catch {
        // No bloquear flujo por un fallo de auditoría.
    }
}
//# sourceMappingURL=auditoria.js.map