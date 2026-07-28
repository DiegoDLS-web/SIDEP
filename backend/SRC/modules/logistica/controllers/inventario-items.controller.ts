import { Request, Response } from 'express';
import * as inventarioItemsService from '../services/inventario-items.service';
import { respuestaErrorJson } from '../../../utils/prisma-error.util';
import { generarExcelInventario, generarPdfInventario } from '../../../utils/export/inventario-export.util';

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

export const postCrearItem = async (req: Request, res: Response) => {
  try {
    const nombre = String(req.body?.nombre ?? '').trim();
    if (!nombre) {
      return res.status(400).json({ success: false, message: 'El nombre del ítem es obligatorio' });
    }
    const data = await inventarioItemsService.crearItemInstitucional({
      nombre,
      cantidad: Number(req.body?.cantidad ?? 1),
      tipoInventario: String(req.body?.tipoInventario ?? 'OTRO'),
      ...(req.body?.bodegaCodigo ? { bodegaCodigo: String(req.body.bodegaCodigo) } : {}),
      marca: req.body?.marca ?? null,
      modelo: req.body?.modelo ?? null,
      estadoFisico: req.body?.estadoFisico ?? null,
      valor: req.body?.valor != null ? Number(req.body.valor) : null,
      observaciones: req.body?.observaciones ?? null,
      talla: req.body?.talla ?? null,
      categoria: req.body?.categoria ?? null,
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    enviarError(res, error, 'Error al registrar material');
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

export const postImportacionInventario = async (req: Request, res: Response) => {
  try {
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file?.buffer) {
      return res.status(400).json({ success: false, message: 'Archivo Excel (.xlsx) requerido' });
    }
    const permitirDuplicados = req.body?.permitirDuplicados === 'true' || req.body?.permitirDuplicados === true;
    const data = await inventarioItemsService.importarDesdeExcelBuffer(file.buffer, { permitirDuplicados });
    res.status(201).json({ success: true, data });
  } catch (error) {
    enviarError(res, error, 'Error al importar inventario');
  }
};

export const getExportExcel = async (req: Request, res: Response) => {
  try {
    const items = await inventarioItemsService.listarParaExport(filtrosDesdeQuery(req));
    const bodega = req.query.bodega ? String(req.query.bodega) : 'completo';
    const buffer = await generarExcelInventario(items, `Inventario ${bodega}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=inventario_${bodega}_${Date.now()}.xlsx`);
    res.status(200).send(buffer);
  } catch (error) {
    enviarError(res, error, 'Error al exportar Excel');
  }
};

export const getExportPdf = async (req: Request, res: Response) => {
  try {
    const items = await inventarioItemsService.listarParaExport(filtrosDesdeQuery(req));
    const bodega = req.query.bodega ? String(req.query.bodega) : 'completo';
    const buffer = await generarPdfInventario(items, `Inventario SIDEP — ${bodega}`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=inventario_${bodega}_${Date.now()}.pdf`);
    res.status(200).send(buffer);
  } catch (error) {
    enviarError(res, error, 'Error al exportar PDF');
  }
};

export const getMovimientosItems = async (req: Request, res: Response) => {
  try {
    const bodega = req.query.bodega ? String(req.query.bodega) : undefined;
    const inventarioItemIdRaw = req.query.inventarioItemId ? Number(req.query.inventarioItemId) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 30;
    const filtros: Parameters<typeof inventarioItemsService.listarMovimientosInventario>[0] = { limit };
    if (bodega) filtros.bodega = bodega;
    if (inventarioItemIdRaw && !Number.isNaN(inventarioItemIdRaw)) {
      filtros.inventarioItemId = inventarioItemIdRaw;
    }
    const data = await inventarioItemsService.listarMovimientosInventario(filtros);
    res.status(200).json({ success: true, data });
  } catch (error) {
    enviarError(res, error, 'Error al listar movimientos');
  }
};

export const postMovimientoItem = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const tipo = String(req.body?.tipo ?? '').trim().toUpperCase();
    const cantidad = Number(req.body?.cantidad);
    if (!id || !['ENTRADA', 'SALIDA', 'AJUSTE'].includes(tipo) || Number.isNaN(cantidad)) {
      return res.status(400).json({ success: false, message: 'Ítem, tipo y cantidad son obligatorios' });
    }
    const data = await inventarioItemsService.registrarMovimientoItem(
      id,
      { tipo: tipo as 'ENTRADA' | 'SALIDA' | 'AJUSTE', cantidad, motivo: req.body?.motivo ?? null },
      rutUsuario(req),
    );
    res.status(201).json({ success: true, data });
  } catch (error) {
    enviarError(res, error, 'Error al registrar movimiento');
  }
};

export const getAlertasInventario = async (req: Request, res: Response) => {
  try {
    const bodega = req.query.bodega ? String(req.query.bodega) : undefined;
    const data = await inventarioItemsService.obtenerAlertasInventario(bodega);
    res.status(200).json({ success: true, data });
  } catch (error) {
    enviarError(res, error, 'Error al obtener alertas');
  }
};

export const getMatrizEpp = async (req: Request, res: Response) => {
  try {
    const data = await inventarioItemsService.listarMatrizEpp(filtrosDesdeQuery(req));
    res.status(200).json({ success: true, data });
  } catch (error) {
    enviarError(res, error, 'Error al obtener matriz EPP');
  }
};

export const getEppPorUsuario = async (req: Request, res: Response) => {
  try {
    const rut = String(req.params.rut ?? '').trim();
    if (!rut) return res.status(400).json({ success: false, message: 'RUT requerido' });
    const solicitante = (req as Request & { user?: { rut?: string }; dbUser?: { rol?: { codigo?: string } } }).user;
    const dbUser = (req as Request & { dbUser?: { rol?: { codigo?: string } } }).dbUser;
    const rol = dbUser?.rol?.codigo?.trim().toUpperCase() ?? '';
    const esOficial = ['ADMIN', 'CAPITAN', 'TENIENTE'].includes(rol);
    if (solicitante?.rut !== rut && !esOficial) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }
    const data = await inventarioItemsService.listarEppPorUsuario(rut);
    res.status(200).json({ success: true, data });
  } catch (error) {
    enviarError(res, error, 'Error al listar EPP del usuario');
  }
};

export const getStockPorNombres = async (req: Request, res: Response) => {
  try {
    const raw = String(req.query.nombres ?? '');
    const nombres = raw.split('|').map((n) => n.trim()).filter(Boolean);
    if (!nombres.length) {
      return res.status(400).json({ success: false, message: 'Indica nombres separados por |' });
    }
    const data = await inventarioItemsService.buscarStockBodegaPorNombres(nombres);
    res.status(200).json({ success: true, data });
  } catch (error) {
    enviarError(res, error, 'Error al consultar stock');
  }
};
