import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendApiError } from '../lib/apiError.js';

export const auditoriaRouter = Router();

auditoriaRouter.get('/', async (req, res) => {
  const take = Math.min(Number(req.query.take ?? 100) || 100, 500);
  try {
    const items = await prisma.actividadUsuario.findMany({
      take,
      orderBy: { fecha: 'desc' },
      include: {
        usuario: {
          select: { id: true, nombre: true, rol: true, email: true },
        },
      },
    });
    res.json(items);
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'AUDITORIA_LIST', 'No se pudo listar la auditoría');
  }
});
