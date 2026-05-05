"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
require("dotenv/config");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const globalForPrisma = globalThis;
function createClient() {
    const url = process.env.DATABASE_URL?.trim();
    if (!url) {
        throw new Error('DATABASE_URL no está definida. Crea un archivo .env en la carpeta backend con DATABASE_URL apuntando a PostgreSQL.');
    }
    const pool = new pg_1.Pool({ connectionString: url });
    const adapter = new adapter_pg_1.PrismaPg(pool);
    return new client_1.PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
}
exports.prisma = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = exports.prisma;
}
//# sourceMappingURL=prisma.js.map