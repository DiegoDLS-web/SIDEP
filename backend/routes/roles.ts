import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

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
    res.status(500).json({ error: 'Error al listar roles' });
  }
});

rolesRouter.post('/', async (req, res) => {
  res.status(400).json({
    error: 'No se pueden crear más roles. Solo se permiten: CAPITAN, TENIENTE, VOLUNTARIOS y ADMIN.',
  });
});

rolesRouter.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id) || id <= 0) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }
  const nombre = req.body?.nombre !== undefined ? String(req.body.nombre).trim().toUpperCase() : undefined;
  const activo = req.body?.activo;
  try {
    const rolActual = await prisma.rolUsuario.findUnique({ where: { id } });
    if (!rolActual || !ROLES_PERMITIDOS.includes(rolActual.nombre as (typeof ROLES_PERMITIDOS)[number])) {
      res.status(400).json({ error: 'Solo se pueden editar los 4 roles permitidos.' });
      return;
    }
    if (nombre !== undefined && nombre !== rolActual.nombre) {
      res.status(400).json({ error: 'No se puede renombrar roles.' });
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
    res.status(500).json({ error: 'No se pudo actualizar rol' });
  }
});
