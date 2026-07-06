/**
 * Punto de entrada de `npx prisma db seed`.
 * Delega en el script de catálogos mínimos del repositorio.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const backendRoot = path.resolve(__dirname, '../..');
const script = path.join(backendRoot, 'scripts', 'seed-catalogos.ts');

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['ts-node', '-r', 'dotenv/config', script],
  { stdio: 'inherit', cwd: backendRoot, env: process.env },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
