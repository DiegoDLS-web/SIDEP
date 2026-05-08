import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middlewares obligatorios
app.use(cors()); // Permite que el frontend de Angular se comunique
app.use(express.json()); // Permite recibir información de los formularios en JSON

// --- RUTAS DE LA API ---

// 1. Ruta de estado (para confirmar que no haya crasheado)
app.get('/api/status', (req, res) => {
  res.json({ mensaje: 'Servidor SIDEP Operativo 🚒' });
});

// 2. Ruta de prueba: Obtener los roles de usuario
app.get('/api/roles', async (req, res) => {
  try {
    // Aquí usamos Prisma para consultar la tabla RolUsuario de Neon
    const roles = await prisma.rolUsuario.findMany();
    res.json(roles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los roles de la base de datos' });
  }
});

// Levantar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});