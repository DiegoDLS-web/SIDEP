import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const result = await prisma.$queryRaw`SELECT 1 AS ok`;
  console.log('OK', result);
} catch (error) {
  console.error('FAIL', error.code, error.message);
} finally {
  await prisma.$disconnect();
}
