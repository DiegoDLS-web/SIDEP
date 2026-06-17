import { Request, Response } from 'express';
import * as auditoriaService from '../services/auditoria.service';

export const getAuditoria = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 20;
    const rut = req.query.rut as string | undefined;
    const accion = req.query.accion as string | undefined;
    const entidad = req.query.entidad as string | undefined;
    const desde = req.query.desde as string | undefined;
    const hasta = req.query.hasta as string | undefined;

    const data = await auditoriaService.listarAuditoria({
      page,
      pageSize,
      rut,
      accion,
      entidad,
      desde,
      hasta,
    });

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('🔥 ERROR AL LISTAR AUDITORIA:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error al obtener auditoría' });
  }
};

export const exportarAuditoria = async (req: Request, res: Response) => {
  try {
    const rut = req.query.rut as string | undefined;
    const accion = req.query.accion as string | undefined;
    const entidad = req.query.entidad as string | undefined;
    const desde = req.query.desde as string | undefined;
    const hasta = req.query.hasta as string | undefined;

    const buffer = await auditoriaService.exportarAuditoriaExcel({
      rut,
      accion,
      entidad,
      desde,
      hasta,
    } as any);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=auditoria_sidep.xlsx'
    );
    return res.status(200).send(buffer);
  } catch (error: any) {
    console.error('🔥 ERROR AL EXPORTAR AUDITORIA:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error al exportar auditoría' });
  }
};
