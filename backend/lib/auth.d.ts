export type JwtPayloadSidep = {
    sub: string;
    uid: number;
    rol: string;
    nombre: string;
    email?: string | null;
};
export declare function firmarToken(payload: JwtPayloadSidep): string;
export declare function verificarToken(token: string): JwtPayloadSidep;
//# sourceMappingURL=auth.d.ts.map