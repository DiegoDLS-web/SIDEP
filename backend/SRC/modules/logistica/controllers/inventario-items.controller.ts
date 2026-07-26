import { Request, Response } from 'express';
import * as inventarioItemsService from '../services/inventario-items.service';
import { respuestaErrorJson } from '../../../utils/prisma-error.util';

function enviarError(res: Response, err: unknown, fallback: string): void {
  const { statusCode, body } = respuestaErrorJson(err, fallback);
  res.status(statusCode).json(body);
}

function rutUsuario(req: Request): string | null {
  const user = (req as Request & { user?: { rut?: string } }).user;
  return user?.rut?.trim() || null;
}

function filtrosDesdeQuery(req: Request): {
  q?: string;
  bodega?: string;
  categoria?: string;
  voluntario?: string;
} {
  const out: { q?: string; bodega?: string; categoria?: string; voluntario?: string } = {};
  if (req.query.q) out.q = String(req.query.q);
  if (req.query.bodega) out.bodega = String(req.query.bodega);
  if (req.query.categoria) out.categoria = String(req.query.categoria);
  if (req.query.voluntario) out.voluntario = String(req.query.voluntario);
  return out;
}

export const getItems = async (req: Request, res: Response) => {
  try {
    const data = await inventarioItemsService.listarItems({
      ...filtrosDesdeQuery(req),
      page: req.query.page ? Number(req.query.page) : 1,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : 50,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    enviarError(res, error, 'Error al listar inventario');
  }
};

export const patchAjustarCantidad = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const delta = Number(req.body?.delta);
    if (!id || Number.isNaN(delta)) {
      return res.status(400).json({ success: false, message: 'ID y delta son obligatorios' });
    }
    const data = await inventarioItemsService.ajustarCantidadItem(id, delta, rutUsuario(req));
    res.status(200).json({ success: true, data });
  } catch (error) {
    enviarError(res, error, 'Error al ajustar cantidad');
  }
};

export const patchMetaItem = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID obligatorio' });
    const data = await inventarioItemsService.actualizarMetaItem(id, {
      talla: req.body?.talla !== undefined ? req.body.talla : undefined,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    enviarError(res, error, 'Error al actualizar ítem');
  }
};

export const postAsignarEpp = async (req: Request, res: Response) => {
  try {
    const inventarioItemId = Number(req.params.id);
    const usuarioRut = String(req.body?.usuarioRut ?? '').trim();
    if (!inventarioItemId || !usuarioRut) {
      return res.status(400).json({ success: false, message: 'Ítem y voluntario son obligatorios' });
    }
    const data = await inventarioItemsService.asignarEppVoluntario({
      inventarioItemId,
      usuarioRut,
      cantidad: req.body?.cantidad ? Number(req.body.cantidad) : 1,
      observaciones: req.body?.observaciones ?? null,
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    enviarError(res, error, 'Error al asignar EPP');
  }
};

export const deleteAsignacionEpp = async (req: Request, res: Response) => {
  try {
    const asignacionId = String(req.params.asignacionId ?? '').trim();
    if (!asignacionId) return res.status(400).json({ success: false, message: 'ID de asignación requerido' });
    const data = await inventarioItemsService.quitarAsignacionEpp(asignacionId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    enviarError(res, error, 'Error al quitar asignación');
  }
};

export const getExportData = async (req: Request, res: Response) => {
  try {
    const data = await inventarioItemsService.listarParaExport(filtrosDesdeQuery(req));
    res.status(200).json({ success: true, data });
  } catch (error) {
    enviarError(res, error, 'Error al exportar inventario');
  }
};

export const getBodegas = async (_req: Request, res: Response) => {
  try {
    const data = await inventarioItemsService.listarBodegas();
    res.status(200).json({ success: true, data });
  } catch (error) {
    enviarError(res, error, 'Error al listar bodegas');
  }
};

export const getEstadoImportacion = async (_req: Request, res: Response) => {
  try {
    const total = await inventarioItemsService.contarItems();
    res.status(200).json({ success: true, data: { total, importado: total > 0 } });
  } catch (error) {
    enviarError(res, error, 'Error al consultar inventario');
  }
};
