import { Request, Response } from 'express';
import { asyncHandler } from '../../middlewares/async-handler';
import * as ia from './ia.service';

export const getEstado = asyncHandler(async (_req: Request, res: Response) => {
  res.json(ia.estadoIa());
});

export const postNovedadAsistir = asyncHandler(async (req: Request, res: Response) => {
  res.json(await ia.asistirNovedad(String(req.body.texto || '')));
});

export const postParteDireccion = asyncHandler(async (req: Request, res: Response) => {
  res.json(await ia.normalizarDireccionParte(String(req.body.direccion || ''), req.body.referencia));
});

export const postParteInconsistencias = asyncHandler(async (req: Request, res: Response) => {
  res.json(await ia.detectarInconsistenciasParte(req.body.payload || req.body));
});

export const postChecklistCriticos = asyncHandler(async (req: Request, res: Response) => {
  res.json(await ia.analizarChecklistCriticos(req.body));
});

export const getChecklistResumenDiario = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await ia.resumenDiarioChecklists());
});

export const postInventarioEstado = asyncHandler(async (req: Request, res: Response) => {
  res.json(await ia.clasificarEstadoDesdeFoto(req.body.descripcion));
});

export const postInventarioMovimiento = asyncHandler(async (req: Request, res: Response) => {
  res.json(await ia.sugerirMovimientoInventario(String(req.body.descripcion || '')));
});

export const getInventarioAlertas = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await ia.alertasInteligentesStock());
});

export const postInventarioTalla = asyncHandler(async (req: Request, res: Response) => {
  res.json(
    ia.matchingTallaEpp(
      String(req.body.nombreArticulo || ''),
      req.body.talla,
      req.body.categoria,
    ),
  );
});

export const postAsistenciaPregunta = asyncHandler(async (req: Request, res: Response) => {
  res.json(await ia.consultarAsistenciaNl(String(req.body.pregunta || '')));
});

export const getAsistenciaHuecos = asyncHandler(async (req: Request, res: Response) => {
  res.json(
    await ia.detectarHuecosCobertura(
      req.query.desde ? String(req.query.desde) : undefined,
      req.query.hasta ? String(req.query.hasta) : undefined,
    ),
  );
});

export const getAsistenciaFaltas = asyncHandler(async (req: Request, res: Response) => {
  res.json(await ia.resumenSemanalFaltas(req.query.grupo ? String(req.query.grupo) : undefined));
});

export const postAnaliticaChat = asyncHandler(async (req: Request, res: Response) => {
  res.json(
    await ia.chatAnalitica(
      String(req.body.pregunta || ''),
      req.body.anio ? Number(req.body.anio) : undefined,
      req.body.mes ? Number(req.body.mes) : undefined,
    ),
  );
});

export const postLicenciaExtraer = asyncHandler(async (req: Request, res: Response) => {
  res.json(await ia.extraerLicenciaDesdeTexto(String(req.body.texto || '')));
});

export const postLicenciaSolape = asyncHandler(async (req: Request, res: Response) => {
  res.json(
    await ia.alertarSolapeLicenciaCuartel(
      String(req.body.usuarioRut || ''),
      String(req.body.fechaInicio || ''),
      String(req.body.fechaTermino || ''),
    ),
  );
});

export const postNotificaciones = asyncHandler(async (req: Request, res: Response) => {
  res.json(await ia.priorizarYRedactarNotificaciones(req.body.alertas || []));
});
