-- AlterTable
ALTER TABLE "mantenimiento_carro" ADD COLUMN IF NOT EXISTS "inspector_nombre" VARCHAR(100);
ALTER TABLE "mantenimiento_carro" ADD COLUMN IF NOT EXISTS "conductor_nombre" VARCHAR(100);
ALTER TABLE "mantenimiento_carro" ADD COLUMN IF NOT EXISTS "firma_inspector" TEXT;
