/**
 * Punto de entrada de `npx prisma db seed`.
 */
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const backendRoot = path.resolve(__dirname, '../..');
const script = path.join(backendRoot, 'scripts', 'seed-catalogos.ts');

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(npx, ['ts-node', '-r', 'dotenv/config', script], {
  stdio: 'inherit',
  cwd: backendRoot,
  env: process.env,
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
