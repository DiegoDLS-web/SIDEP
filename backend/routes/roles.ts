import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendApiError } from '../lib/apiError.js';

export const rolesRouter = Router();
const ROLES_PERMITIDOS = ['CAPITAN', 'TENIENTE', 'VOLUNTARIOS', 'ADMIN'] as const;

async function sincronizarRolesPermitidos(): Promise<void> {
  for (const nombre of ROLES_PERMITIDOS) {
    await prisma.rolUsuario.upsert({
      where: { nombre },
      update: {},
      create: { nombre, activo: true },
    });
  }
  await prisma.rolUsuario.updateMany({
    where: { nombre: { notIn: [...ROLES_PERMITIDOS] } },
    data: { activo: false },
  });
}

rolesRouter.get('/', async (req, res) => {
  const soloActivos = req.query.activos === '1' || req.query.activos === 'true';
  try {
    await sincronizarRolesPermitidos();
    const roles = soloActivos
      ? await prisma.rolUsuario.findMany({
          where: { activo: true, nombre: { in: [...ROLES_PERMITIDOS] } },
          orderBy: { nombre: 'asc' },
        })
      : await prisma.rolUsuario.findMany({
          where: { nombre: { in: [...ROLES_PERMITIDOS] } },
          orderBy: { nombre: 'asc' },
        });
    res.json(roles);
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'ROLES_LIST', 'Error al listar roles');
  }
});

rolesRouter.post('/', async (req, res) => {
  sendApiError(
    res,
    400,
    'ROLES_CREATE_DISABLED',
    'No se pueden crear más roles. Solo se permiten: CAPITAN, TENIENTE, VOLUNTARIOS y ADMIN.',
  );
});

rolesRouter.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id) || id <= 0) {
    sendApiError(res, 400, 'ROLES_ID_INVALIDO', 'ID inválido');
    return;
  }
  const nombre = req.body?.nombre !== undefined ? String(req.body.nombre).trim().toUpperCase() : undefined;
  const activo = req.body?.activo;
  try {
    const rolActual = await prisma.rolUsuario.findUnique({ where: { id } });
    if (!rolActual || !ROLES_PERMITIDOS.includes(rolActual.nombre as (typeof ROLES_PERMITIDOS)[number])) {
      sendApiError(res, 400, 'ROLES_EDITAR_NO_PERMITIDO', 'Solo se pueden editar los 4 roles permitidos.');
      return;
    }
    if (nombre !== undefined && nombre !== rolActual.nombre) {
      sendApiError(res, 400, 'ROLES_RENAME_DISABLED', 'No se puede renombrar roles.');
      return;
    }
    const actualizado = await prisma.rolUsuario.update({
      where: { id },
      data: {
        ...(activo !== undefined ? { activo: Boolean(activo) } : {}),
      },
    });
    res.json(actualizado);
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'ROLES_UPDATE', 'No se pudo actualizar rol');
  }
});
