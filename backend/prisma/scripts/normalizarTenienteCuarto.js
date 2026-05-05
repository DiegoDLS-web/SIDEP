"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Corrige cargos TENIENTE_CUARTO mal asignados masivamente (solo debe quedar quien corresponde en nómina).
 * Ejecutar: npx ts-node prisma/scripts/normalizarTenienteCuarto.ts
 */
require("dotenv/config");
const prisma_js_1 = require("../../lib/prisma.js");
const NOMBRES_OFICIALES_TENIENTE_CUARTO = new Set(['Claudio Aroca Oñate']);
async function main() {
    const r = await prisma_js_1.prisma.usuario.updateMany({
        where: {
            cargoOficialidad: 'TENIENTE_CUARTO',
            nombre: { notIn: [...NOMBRES_OFICIALES_TENIENTE_CUARTO] },
        },
        data: { cargoOficialidad: 'VOLUNTARIO' },
    });
    console.log(`Actualizados registros con TENIENTE_CUARTO → VOLUNTARIO: ${r.count}`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma_js_1.prisma.$disconnect();
});
//# sourceMappingURL=normalizarTenienteCuarto.js.map