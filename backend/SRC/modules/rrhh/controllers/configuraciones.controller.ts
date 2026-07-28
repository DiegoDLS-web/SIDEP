import { Request, Response } from 'express';
import * as configuracionesService from '../services/configuraciones.service';
import { enviarCorreoPrueba, verificarConexionSmtp } from '../../../utils/email/email.service';
import { listarEmailLogs } from '../../../utils/email/email-log.service';

export const obtenerConfiguraciones = async (req: Request, res: Response) => {
  try {
    const dto = await configuracionesService.obtenerConfiguracionesService();
    return res.status(200).json(dto);
  } catch (error: any) {
    console.error('🔥 ERROR EN GET CONFIGURACIONES:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener configuraciones' });
  }
};

export const obtenerConfiguracionOperativa = async (req: Request, res: Response) => {
  try {
    const dto = await configuracionesService.obtenerConfiguracionOperativaService();
    return res.status(200).json(dto);
  } catch (error: any) {
    console.error('🔥 ERROR EN GET CONFIGURACION OPERATIVA:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener configuración operativa' });
  }
};

export const actualizarConfiguraciones = async (req: Request, res: Response) => {
  try {
    const dto = await configuracionesService.actualizarConfiguracionesService(req.body);
    return res.status(200).json(dto);
  } catch (error: any) {
    console.error('🔥 ERROR EN ACTUALIZAR CONFIGURACIONES:', error);
    return res.status(500).json({ success: false, error: 'Error al actualizar configuraciones' });
  }
};

export const subirLogoCompania = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se subió ningún archivo' });
    }

    const fileData = req.file as any;
    const nuevaUrl = fileData.path;
    const nuevoPublicId = fileData.filename;

    const path = await configuracionesService.actualizarLogoCompania(nuevaUrl, nuevoPublicId);

    return res.status(200).json({
      ok: true,
      path
    });
  } catch (error: any) {
    console.error('🔥 ERROR EN SUBIR LOGO COMPAÑIA:', error);
    return res.status(500).json({ ok: false, error: 'Error al subir el logo' });
  }
};

export const actualizarTiposEmergencia = async (req: Request, res: Response) => {
  try {
    const { tiposEmergencia } = req.body;
    const dto = await configuracionesService.actualizarTiposEmergenciaService(tiposEmergencia);
    return res.status(200).json(dto);
  } catch (error: any) {
    console.error('🔥 ERROR EN ACTUALIZAR TIPOS EMERGENCIA:', error);
    return res.status(500).json({ success: false, error: 'Error al actualizar tipos de emergencia' });
  }
};

export const probarCorreo = async (req: Request, res: Response) => {
  try {
    const to = String(req.body?.to ?? '').trim();
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return res.status(400).json({ success: false, error: 'Indica un correo de destino válido.' });
    }
    await verificarConexionSmtp();
    await enviarCorreoPrueba(to);
    return res.status(200).json({ ok: true, message: `Correo de prueba enviado a ${to}` });
  } catch (error: any) {
    const msg =
      error?.message === 'SMTP_NO_CONFIGURADO'
        ? 'El envío SMTP no está configurado en el servidor.'
        : 'No se pudo enviar el correo de prueba.';
    console.error('🔥 ERROR EN PROBAR CORREO:', error);
    return res.status(500).json({ success: false, error: msg });
  }
};

export const obtenerLogsCorreo = async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit ?? 50);
    const logs = await listarEmailLogs(limit);
    return res.status(200).json(
      logs.map((l) => ({
        id: l.id,
        tipo: l.tipo,
        destinatario: l.destinatario,
        subject: l.subject,
        ok: l.ok === 1,
        detalle: l.detalle,
        createdAt: l.createdAt.toISOString(),
      })),
    );
  } catch (error: any) {
    console.error('🔥 ERROR EN LOGS CORREO:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener historial de correos' });
  }
};
