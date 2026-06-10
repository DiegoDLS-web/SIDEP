import { Request, Response } from 'express';
import * as licenciasService from '../services/licencias.service';

// ─── 1. GET /api/licencias/mis — Licencias propias ──────────────────
export const getMisLicencias = async (req: Request, res: Response) => {
  try {
    const rut = (req as any).user?.rut;
    if (!rut) return res.status(401).json({ success: false, message: 'No autorizado' });

    const list = await licenciasService.listarMisLicencias(rut);
    return res.status(200).json(list);
  } catch (error: any) {
    console.error('🔥 ERROR EN GET MIS LICENCIAS:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error al obtener licencias' });
  }
};

// ─── 2. POST /api/licencias — Crear licencia (JSON o multipart) ─────
export const postLicencia = async (req: Request, res: Response) => {
  try {
    const rut = (req as any).user?.rut;
    if (!rut) return res.status(401).json({ success: false, message: 'No autorizado' });

    // Si se subió un archivo adjunto via multer
    let archivoUrl: string | null = null;
    let archivoPublicId: string | null = null;
    if (req.file) {
      const fileData = req.file as any;
      archivoUrl = fileData.path;        // secure_url de Cloudinary
      archivoPublicId = fileData.filename; // public_id de Cloudinary
    }

    const nueva = await licenciasService.crearLicencia(rut, {
      fechaInicio: req.body.fechaInicio,
      fechaTermino: req.body.fechaTermino,
      motivo: req.body.motivo,
      archivoUrl,
      archivoPublicId,
    });

    return res.status(201).json(nueva);
  } catch (error: any) {
    console.error('🔥 ERROR EN CREAR LICENCIA:', error);
    return res.status(400).json({ success: false, error: error.message || 'Error al crear licencia' });
  }
};

// ─── 3. PATCH /api/licencias/:id — Editar licencia ──────────────────
export const patchLicencia = async (req: Request, res: Response) => {
  try {
    const rut = (req as any).user?.rut;
    if (!rut) return res.status(401).json({ success: false, message: 'No autorizado' });

    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'ID inválido' });

    const actualizada = await licenciasService.editarLicencia(id, rut, req.body);
    return res.status(200).json(actualizada);
  } catch (error: any) {
    console.error('🔥 ERROR EN EDITAR LICENCIA:', error);
    return res.status(400).json({ success: false, error: error.message || 'Error al editar licencia' });
  }
};

// ─── 4. GET /api/licencias — Listar todas (gestión) ─────────────────
export const getLicencias = async (req: Request, res: Response) => {
  try {
    const estado = req.query.estado as string | undefined;
    const list = await licenciasService.listarGestion(estado);
    return res.status(200).json(list);
  } catch (error: any) {
    console.error('🔥 ERROR EN GET LICENCIAS GESTION:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error al obtener licencias' });
  }
};

// ─── 5. PATCH /api/licencias/:id/estado — Cambiar estado ────────────
export const patchEstado = async (req: Request, res: Response) => {
  try {
    const rut = (req as any).user?.rut;
    if (!rut) return res.status(401).json({ success: false, message: 'No autorizado' });

    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'ID inválido' });

    const { estado, observacionResolucion } = req.body;
    if (!estado) return res.status(400).json({ success: false, message: 'Estado requerido' });

    const actualizada = await licenciasService.cambiarEstado(id, rut, estado, observacionResolucion);
    return res.status(200).json(actualizada);
  } catch (error: any) {
    console.error('🔥 ERROR EN CAMBIAR ESTADO LICENCIA:', error);
    return res.status(400).json({ success: false, error: error.message || 'Error al cambiar estado' });
  }
};

// ─── 6. GET /api/licencias/activas — Activas en una fecha ───────────
export const getLicenciasActivas = async (req: Request, res: Response) => {
  try {
    const fecha = (req.query.fecha as string) || new Date().toISOString().slice(0, 10);
    const list = await licenciasService.listarActivas(fecha);
    return res.status(200).json(list);
  } catch (error: any) {
    console.error('🔥 ERROR EN GET LICENCIAS ACTIVAS:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error al obtener licencias activas' });
  }
};

// ─── 7. GET /api/licencias/resumen — Resumen diario ─────────────────
export const getResumen = async (req: Request, res: Response) => {
  try {
    const fecha = req.query.fecha as string | undefined;
    const resumen = await licenciasService.obtenerResumen(fecha);
    return res.status(200).json(resumen);
  } catch (error: any) {
    console.error('🔥 ERROR EN GET RESUMEN LICENCIAS:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error al obtener resumen' });
  }
};
