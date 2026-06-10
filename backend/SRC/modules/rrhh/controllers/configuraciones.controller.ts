import { Request, Response } from 'express';
import prisma from '../../../prisma';
import { StorageService } from '../../../shared/storage';

function mapConfiguracionToDto(config: any) {
  let navegacion = undefined;
  if (config.navegacionPorRol) {
    try {
      navegacion = JSON.parse(config.navegacionPorRol);
    } catch (e) { }
  }

  let tipos = undefined;
  if (config.tiposEmergencia) {
    try {
      tipos = JSON.parse(config.tiposEmergencia);
    } catch (e) { }
  }

  return {
    compania: {
      nombreCompania: config.nombreCompania || '',
      nombreBomba: config.nombreBomba || '',
      direccion: config.direccion || '',
      telefono: config.telefono || '',
      emailInstitucional: config.emailInstitucional || '',
      fechaFundacion: config.fechaFundacion ? config.fechaFundacion.toISOString().split('T')[0] : ''
    },
    notificaciones: {
      alertasEmergencia: config.alertasEmergencia === 1,
      alertasInventario: config.alertasInventario === 1,
      recordatoriosChecklist: config.recordatoriosChecklist === 1,
      resumenDiarioEmail: config.resumenDiarioEmail === 1,
    },
    reportes: {
      formatoPredeterminado: config.formatoPredeterminado || 'PDF',
      logosPdf: config.logosPdf || 'AMBOS',
      orientacionPdf: config.orientacionPdf || 'VERTICAL'
    },
    navegacionPorRol: navegacion,
    tiposEmergencia: tipos
  };
}

export const obtenerConfiguraciones = async (req: Request, res: Response) => {
  try {
    let config = await prisma.configuracionSistema.findUnique({ where: { id: 1 } });

    if (!config) {
      config = await prisma.configuracionSistema.create({
        data: {
          id: 1,
          nombreCompania: '1ª Compañía Santa Juana',
        }
      });
    }

    const dto = mapConfiguracionToDto(config);
    return res.status(200).json(dto);
  } catch (error: any) {
    console.error('🔥 ERROR EN GET CONFIGURACIONES:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener configuraciones' });
  }
};

export const actualizarConfiguraciones = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    let config = await prisma.configuracionSistema.findUnique({ where: { id: 1 } });
    if (!config) {
      config = await prisma.configuracionSistema.create({ data: { id: 1, nombreCompania: '1ª Compañía Santa Juana' } });
    }

    const navegacionPorRolStr = data.navegacionPorRol ? JSON.stringify(data.navegacionPorRol) : null;
    let fechaFundacionDb = null;
    if (data.compania?.fechaFundacion) {
      fechaFundacionDb = new Date(data.compania.fechaFundacion);
    }

    const configActualizada = await prisma.configuracionSistema.update({
      where: { id: 1 },
      data: {
        nombreCompania: data.compania?.nombreCompania || config.nombreCompania,
        nombreBomba: data.compania?.nombreBomba || null,
        direccion: data.compania?.direccion || null,
        telefono: data.compania?.telefono || null,
        emailInstitucional: data.compania?.emailInstitucional || null,
        fechaFundacion: fechaFundacionDb,

        alertasEmergencia: data.notificaciones?.alertasEmergencia ? 1 : 0,
        alertasInventario: data.notificaciones?.alertasInventario ? 1 : 0,
        recordatoriosChecklist: data.notificaciones?.recordatoriosChecklist ? 1 : 0,
        resumenDiarioEmail: data.notificaciones?.resumenDiarioEmail ? 1 : 0,

        formatoPredeterminado: data.reportes?.formatoPredeterminado || 'PDF',
        logosPdf: data.reportes?.logosPdf || 'AMBOS',
        orientacionPdf: data.reportes?.orientacionPdf || 'VERTICAL',

        navegacionPorRol: navegacionPorRolStr !== null ? navegacionPorRolStr : config.navegacionPorRol
      }
    });

    return res.status(200).json(mapConfiguracionToDto(configActualizada));
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

    let config = await prisma.configuracionSistema.findUnique({ where: { id: 1 } });
    if (!config) {
      config = await prisma.configuracionSistema.create({ data: { id: 1, nombreCompania: '1ª Compañía Santa Juana' } });
    }

    if (config.logoPublicId) {
      await StorageService.deleteFile(config.logoPublicId);
    }

    await prisma.configuracionSistema.update({
      where: { id: 1 },
      data: {
        logoUrl: nuevaUrl,
        logoPublicId: nuevoPublicId,
      }
    });

    return res.status(200).json({
      ok: true,
      path: nuevaUrl
    });
  } catch (error: any) {
    console.error('🔥 ERROR EN SUBIR LOGO COMPAÑIA:', error);
    return res.status(500).json({ ok: false, error: 'Error al subir el logo' });
  }
};

export const actualizarTiposEmergencia = async (req: Request, res: Response) => {
  try {
    const { tiposEmergencia } = req.body;
    const tiposStr = JSON.stringify(tiposEmergencia || []);

    let config = await prisma.configuracionSistema.findUnique({ where: { id: 1 } });
    if (!config) {
      config = await prisma.configuracionSistema.create({ data: { id: 1, nombreCompania: '1ª Compañía Santa Juana' } });
    }

    const configActualizada = await prisma.configuracionSistema.update({
      where: { id: 1 },
      data: { tiposEmergencia: tiposStr }
    });

    return res.status(200).json(mapConfiguracionToDto(configActualizada));
  } catch (error: any) {
    console.error('🔥 ERROR EN ACTUALIZAR TIPOS EMERGENCIA:', error);
    return res.status(500).json({ success: false, error: 'Error al actualizar tipos de emergencia' });
  }
};
