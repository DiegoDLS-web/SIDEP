import prisma from '../../../prisma';
import { StorageService } from '../../../shared/storage';

export function mapConfiguracionToDto(config: any) {
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

/** Datos operativos sin navegación por rol ni preferencias de notificación (lectura para cualquier autenticado). */
export function mapConfiguracionOperativaToDto(config: any) {
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
      fechaFundacion: config.fechaFundacion ? config.fechaFundacion.toISOString().split('T')[0] : '',
    },
    reportes: {
      formatoPredeterminado: config.formatoPredeterminado || 'PDF',
      logosPdf: config.logosPdf || 'AMBOS',
      orientacionPdf: config.orientacionPdf || 'VERTICAL',
    },
    tiposEmergencia: tipos,
  };
}

export const getDbConfiguracion = async () => {
  let config = await prisma.configuracionSistema.findUnique({ where: { id: 1 } });
  if (!config) {
    config = await prisma.configuracionSistema.create({
      data: {
        id: 1,
        nombreCompania: '1ª Compañía Santa Juana',
      }
    });
  }
  return config;
};

export const obtenerConfiguracionesService = async () => {
  const config = await getDbConfiguracion();
  return mapConfiguracionToDto(config);
};

export const obtenerConfiguracionOperativaService = async () => {
  const config = await getDbConfiguracion();
  return mapConfiguracionOperativaToDto(config);
};

export const actualizarConfiguracionesService = async (data: any) => {
  const config = await getDbConfiguracion();

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

  return mapConfiguracionToDto(configActualizada);
};

export const actualizarLogoCompania = async (nuevaUrl: string, nuevoPublicId: string) => {
  const config = await getDbConfiguracion();

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

  return nuevaUrl;
};

export const actualizarTiposEmergenciaService = async (tiposEmergencia: any[]) => {
  await getDbConfiguracion();
  const tiposStr = JSON.stringify(tiposEmergencia || []);

  const configActualizada = await prisma.configuracionSistema.update({
    where: { id: 1 },
    data: { tiposEmergencia: tiposStr }
  });

  return mapConfiguracionToDto(configActualizada);
};
