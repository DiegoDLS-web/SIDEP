import { Prisma } from '@prisma/client';
type RegistrarActividadInput = {
    usuarioId?: number | undefined;
    accion: string;
    modulo: string;
    referencia?: string | undefined;
    detalle?: Prisma.InputJsonValue | undefined;
};
export declare function registrarActividad(input: RegistrarActividadInput): Promise<void>;
export {};
//# sourceMappingURL=auditoria.d.ts.map