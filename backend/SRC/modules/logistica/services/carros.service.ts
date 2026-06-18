import prisma from '../../../prisma';
import { AppError } from '../../../utils';
import { randomUUID } from 'crypto';

const METADATA: Record<string, { tipo: string; capacidadAgua: string; anioFabricacion: number }> = {
  'B-1': { tipo: 'Bomba', capacidadAgua: '5000 litros', anioFabricacion: 2004 },
  'BX-1': { tipo: 'Multipropósito', capacidadAgua: '3000 litros', anioFabricacion: 2017 },
  'R-1': { tipo: 'Rescate', capacidadAgua: '2000 litros', anioFabricacion: 2021 },
};

/** Fechas de alerta por defecto cuando aún no hay registro de mantención en BD. */
const MANTENIMIENTO_DEFAULT: Record<
  string,
  { proximoMantenimiento: string; proximaRevisionTecnica: string }
> = {
  'B-1': { proximoMantenimiento: '2026-07-10T12:00:00.000Z', proximaRevisionTecnica: '2026-07-09T12:00:00.000Z' },
  'BX-1': { proximoMantenimiento: '2026-07-08T12:00:00.000Z', proximaRevisionTecnica: '2026-07-09T12:00:00.000Z' },
  'R-1': { proximoMantenimiento: '2026-06-30T12:00:00.000Z', proximaRevisionTecnica: '2026-07-05T12:00:00.000Z' },
};

function aplicarMantenimientoDefault(nomenclatura: string, ficha: Record<string, unknown>): Record<string, unknown> {
  const def = MANTENIMIENTO_DEFAULT[nomenclatura];
  if (!def) return ficha;
  const out = { ...ficha };
  if (!out['proximoMantenimiento']) out['proximoMantenimiento'] = def.proximoMantenimiento;
  if (!out['proximaRevisionTecnica']) out['proximaRevisionTecnica'] = def.proximaRevisionTecnica;
  return out;
}

function enriquecerCarro(carro: any) {
  const meta = METADATA[carro.nomenclatura];
  return {
    ...carro,
    kilometraje: Number(carro.kilometraje ?? 0),
    tipo: meta?.tipo ?? null,
    capacidadAgua: meta?.capacidadAgua ?? null,
    anioFabricacion: meta?.anioFabricacion ?? null,
  };
}

function toDateOnly(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isoFromDateOnly(value: Date | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function nombreUsuario(u: { nombres?: string | null; apellidoPaterno?: string | null } | null | undefined): string | null {
  if (!u) return null;
  const n = [u.nombres, u.apellidoPaterno].filter(Boolean).join(' ').trim();
  return n || null;
}

function empaquetarDescripcionYFirma(descripcion: string | null | undefined, firma: string | null | undefined): string | null {
  const texto = (descripcion ?? '').trim();
  const f = (firma ?? '').trim();
  if (!texto && !f) return null;
  if (f.startsWith('data:image')) {
    return JSON.stringify({ texto, firma: f });
  }
  return texto || null;
}

function desempaquetarDescripcionYFirma(raw: string | null | undefined): { descripcion: string | null; firma: string | null } {
  const val = (raw ?? '').trim();
  if (!val) return { descripcion: null, firma: null };
  if (val.startsWith('{')) {
    try {
      const parsed = JSON.parse(val) as { texto?: string; firma?: string };
      if (parsed && typeof parsed === 'object') {
        return {
          descripcion: (parsed.texto ?? '').trim() || null,
          firma: (parsed.firma ?? '').trim().startsWith('data:image') ? parsed.firma!.trim() : null,
        };
      }
    } catch {
      /* texto plano */
    }
  }
  return { descripcion: val, firma: null };
}

function mapMantenimientoAFicha(m: any) {
  if (!m) {
    return {
      ultimoMantenimiento: null,
      proximoMantenimiento: null,
      proximaRevisionTecnica: null,
      ultimaRevisionBombaAgua: null,
      descripcionUltimoMantenimiento: null,
      ultimoInspector: null,
      firmaUltimoInspector: null,
      fechaUltimaInspeccion: null,
      ultimoConductor: null,
      conductorAsignado: null,
    };
  }
  const ultimoInspector = m.inspectorNombre?.trim() || nombreUsuario(m.inspector) || null;
  const ultimoConductor = m.conductorNombre?.trim() || nombreUsuario(m.conductor) || null;
  const desemp = desempaquetarDescripcionYFirma(m.descripcion);
  const firmaCol = (m.firmaInspector ?? '').trim();
  return {
    ultimoMantenimiento: isoFromDateOnly(m.fechaMantenimiento),
    proximoMantenimiento: isoFromDateOnly(m.fechaProximoMantenimiento),
    proximaRevisionTecnica: isoFromDateOnly(m.fechaProximaRevTecnica),
    ultimaRevisionBombaAgua: isoFromDateOnly(m.fechaRevBomba),
    descripcionUltimoMantenimiento: desemp.descripcion,
    ultimoInspector,
    firmaUltimoInspector: firmaCol.startsWith('data:image') ? firmaCol : desemp.firma,
    fechaUltimaInspeccion: isoFromDateOnly(m.fechaInspeccion),
    ultimoConductor,
    conductorAsignado: ultimoConductor,
  };
}

function mapMantenimientoAHistorial(m: any) {
  const ficha = mapMantenimientoAFicha(m);
  return {
    id: m.id,
    carroId: m.carroId,
    creadoEn: m.fechaRegistro instanceof Date ? m.fechaRegistro.toISOString() : String(m.fechaRegistro),
    ...ficha,
  };
}

const mantenimientoInclude = {
  inspector: { select: { rut: true, nombres: true, apellidoPaterno: true } },
  conductor: { select: { rut: true, nombres: true, apellidoPaterno: true } },
} as const;

async function resolverRutPorNombre(nombre: string | null | undefined): Promise<string | null> {
  const n = (nombre ?? '').trim();
  if (!n) return null;
  const usuario = await prisma.usuario.findFirst({
    where: { nombres: { equals: n, mode: 'insensitive' } },
    select: { rut: true },
  });
  return usuario?.rut ?? null;
}

export const obtenerCarroEnriquecido = async (id: string) => {
  const carro = await prisma.carro.findUnique({
    where: { id },
    include: {
      bolsos: true,
      materiales: true,
      mantenimientos: {
        orderBy: { fechaRegistro: 'desc' },
        take: 1,
        include: mantenimientoInclude,
      },
    },
  });
  if (!carro) throw new AppError('Carro no encontrado', 404);
  const { mantenimientos, ...resto } = carro;
  const base = enriquecerCarro(resto);
  const ficha = aplicarMantenimientoDefault(
    carro.nomenclatura,
    mapMantenimientoAFicha(mantenimientos[0] ?? null) as Record<string, unknown>,
  );
  return { ...base, ...ficha };
}

function tieneDatosMantenimiento(datos: Record<string, unknown>): boolean {
  const claves = [
    'ultimoMantenimiento',
    'proximoMantenimiento',
    'proximaRevisionTecnica',
    'ultimaRevisionBombaAgua',
    'descripcionUltimoMantenimiento',
    'ultimoInspector',
    'firmaUltimoInspector',
    'fechaUltimaInspeccion',
    'ultimoConductor',
    'conductorAsignado',
  ];
  return claves.some((k) => datos[k] !== undefined);
}

export const crearCarro = async (datos: any) => {
  const existe = await prisma.carro.findUnique({ where: { nomenclatura: datos.nomenclatura } });
  if (existe) throw new AppError('Ya existe un carro con esta nomenclatura', 400);

  return await prisma.carro.create({
    data: {
      id: randomUUID(),
      patente: datos.patente,
      nomenclatura: datos.nomenclatura,
      nombre: datos.nombre,
      marca: datos.marca,
      kilometraje: datos.kilometraje ? Number(datos.kilometraje) : 0,
      estadoOperativo: 1,
    },
  });
};

export const actualizarCarro = async (id: string, datos: any) => {
  const carro = await prisma.carro.findUnique({ where: { id } });
  if (!carro) throw new AppError('Carro no encontrado', 404);

  const dataToUpdate: Record<string, unknown> = {};
  if (datos.patente !== undefined) dataToUpdate.patente = datos.patente;
  if (datos.nomenclatura !== undefined) dataToUpdate.nomenclatura = datos.nomenclatura;
  if (datos.nombre !== undefined) dataToUpdate.nombre = datos.nombre;
  if (datos.marca !== undefined) dataToUpdate.marca = datos.marca;
  if (datos.kilometraje !== undefined) dataToUpdate.kilometraje = Number(datos.kilometraje);
  if (datos.estadoOperativo !== undefined) dataToUpdate.estadoOperativo = Number(datos.estadoOperativo);

  if (Object.keys(dataToUpdate).length > 0) {
    await prisma.carro.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  if (tieneDatosMantenimiento(datos)) {
    const conductorNombre = (datos.ultimoConductor ?? datos.conductorAsignado ?? null) as string | null;
    const [inspectorRut, conductorRut] = await Promise.all([
      resolverRutPorNombre(datos.ultimoInspector),
      resolverRutPorNombre(conductorNombre),
    ]);
    await prisma.mantenimientoCarro.create({
      data: {
        id: randomUUID(),
        carroId: id,
        fechaRegistro: new Date(),
        fechaMantenimiento: toDateOnly(datos.ultimoMantenimiento),
        fechaProximoMantenimiento: toDateOnly(datos.proximoMantenimiento),
        fechaProximaRevTecnica: toDateOnly(datos.proximaRevisionTecnica),
        fechaRevBomba: toDateOnly(datos.ultimaRevisionBombaAgua),
        fechaInspeccion: toDateOnly(datos.fechaUltimaInspeccion),
        inspectorRut,
        conductorRut,
        inspectorNombre: datos.ultimoInspector?.trim() || null,
        conductorNombre: conductorNombre?.trim() || null,
        firmaInspector: datos.firmaUltimoInspector ?? null,
        descripcion: empaquetarDescripcionYFirma(
          datos.descripcionUltimoMantenimiento,
          datos.firmaUltimoInspector,
        ),
      },
    });
  }

  return obtenerCarroEnriquecido(id);
};

export const obtenerCarros = async () => {
  const carros = await prisma.carro.findMany({
    include: {
      bolsos: true,
      materiales: true,
      mantenimientos: {
        orderBy: { fechaRegistro: 'desc' },
        take: 1,
        include: mantenimientoInclude,
      },
    },
    orderBy: { nomenclatura: 'asc' },
  });
  return carros.map((carro) => {
    const { mantenimientos, ...resto } = carro;
    const base = enriquecerCarro(resto);
    const ficha = aplicarMantenimientoDefault(
      carro.nomenclatura,
      mapMantenimientoAFicha(mantenimientos[0] ?? null) as Record<string, unknown>,
    );
    return { ...base, ...ficha };
  });
};

function parseFechaFiltroLocal(isoDate: string, finDeDia = false): Date | null {
  const t = isoDate.trim();
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  if (finDeDia) return new Date(y, mo, day, 23, 59, 59, 999);
  return new Date(y, mo, day, 0, 0, 0, 0);
}

export const historialMantenimientoGeneral = async (filtros: {
  carroId?: string;
  desde?: string;
  hasta?: string;
}) => {
  const where: Record<string, unknown> = {};
  if (filtros.carroId?.trim()) {
    where.carroId = filtros.carroId.trim();
  }
  if (filtros.desde?.trim() || filtros.hasta?.trim()) {
    const fechaRegistro: Record<string, Date> = {};
    if (filtros.desde?.trim()) {
      const d = parseFechaFiltroLocal(filtros.desde.trim(), false);
      if (d) fechaRegistro.gte = d;
    }
    if (filtros.hasta?.trim()) {
      const h = parseFechaFiltroLocal(filtros.hasta.trim(), true);
      if (h) fechaRegistro.lte = h;
    }
    if (Object.keys(fechaRegistro).length > 0) {
      where.fechaRegistro = fechaRegistro;
    }
  }

  const rows = await prisma.mantenimientoCarro.findMany({
    where,
    orderBy: { fechaRegistro: 'desc' },
    include: {
      carro: { select: { id: true, nomenclatura: true, nombre: true, patente: true } },
      ...mantenimientoInclude,
    },
  });

  return rows.map((m) => ({
    ...mapMantenimientoAHistorial(m),
    carro: {
      id: m.carro.id,
      nomenclatura: m.carro.nomenclatura,
      nombre: m.carro.nombre,
      patente: m.carro.patente,
    },
  }));
};

export const cambiarEstadoOperativo = async (id: string, estado: number) => {
  const carro = await prisma.carro.findUnique({ where: { id } });
  if (!carro) throw new AppError('Carro no encontrado', 404);

  return await prisma.carro.update({
    where: { id },
    data: { estadoOperativo: estado },
  });
};
