import { PrismaClient, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export const crearParteConRelaciones = async (data: any) => {
  return await prisma.$transaction(async (tx) => {
    const parteId = uuidv4();
    
    // 1. Crear el Parte Principal
    const parte = await tx.parteEmergencia.create({
      data: {
        id: parteId,
        correlativo: data.correlativo || `P-${Date.now()}`,
        estadoId: data.estadoId || 1, 
        fechaEmergencia: data.fechaEmergencia ? new Date(data.fechaEmergencia) : new Date(),
        claveId: data.claveId,
        obacRut: data.obacRut,
        direccion: data.direccion,
        referenciaLugar: data.referenciaLugar || null,
        trabajoRealizado: data.trabajoRealizado || null,
        materialUtilizado: data.materialUtilizado || null
      }
    });

    // 2. Insertar Asistencias limpiando duplicados con Tipado Estricto de Prisma
    if (data.asistencias && Array.isArray(data.asistencias) && data.asistencias.length > 0) {
      // Usamos Map con tipos explícitos para que Prisma no lance error de 'unknown[]'
      const asistenciasUnicas = new Map<string, Prisma.AsistenciaPersonalCreateManyInput>();
      
      for (const a of data.asistencias) {
        const rut = a.usuarioRut || a;
        if (!asistenciasUnicas.has(rut)) {
          asistenciasUnicas.set(rut, {
            id: uuidv4(),
            parteId: parteId,
            usuarioRut: rut
          });
        }
      }
      
      const asistenciasData: Prisma.AsistenciaPersonalCreateManyInput[] = Array.from(asistenciasUnicas.values());
      await tx.asistenciaPersonal.createMany({ data: asistenciasData });
    }

    // 3. Insertar Unidades/Carros Participantes con Tipado Estricto de Prisma
    if (data.unidades && Array.isArray(data.unidades) && data.unidades.length > 0) {
      const unidadesData: Prisma.UnidadEnEmergenciaCreateManyInput[] = data.unidades.map((u: any) => ({
        id: uuidv4(),
        parteId: parteId,
        carroId: u.carroId,
        conductorRut: u.conductorRut || null,
        horaSalida: u.horaSalida ? new Date(u.horaSalida) : new Date(),
        horaLlegada: u.horaLlegada ? new Date(u.horaLlegada) : new Date(),
        kmSalida: u.kmSalida || 0,
        kmLlegada: u.kmLlegada || 0
      }));
      await tx.unidadEnEmergencia.createMany({ data: unidadesData });
    }

    return parte;
  });
};

export const obtenerTodos = async () => {
  return await prisma.parteEmergencia.findMany({
    include: {
      clave: true,
      estado: true,
      obac: true
    }
  });
};

export const obtenerPorId = async (id: string) => {
  return await prisma.parteEmergencia.findUnique({
    where: { id },
    include: {
      clave: true,
      estado: true,
      obac: true,
      asistencias: { include: { usuario: true } },
      unidades: { include: { carro: true, conductor: true } }
    }
  });
};

export const actualizarParte = async (id: string, data: any) => {
  return await prisma.parteEmergencia.update({
    where: { id },
    data: {
      direccion: data.direccion,
      trabajoRealizado: data.trabajoRealizado,
      referenciaLugar: data.referenciaLugar,
      estadoId: data.estadoId
    }
  });
};

export const anularParte = async (id: string) => {
  // Asume que 3 es Anulado en tu CatalogoEstadoParte
  return await prisma.parteEmergencia.update({
    where: { id },
    data: { estadoId: 3 } 
  });
};