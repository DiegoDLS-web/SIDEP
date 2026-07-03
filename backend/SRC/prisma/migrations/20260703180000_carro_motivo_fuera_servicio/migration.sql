-- Motivo obligatorio al dejar unidad fuera de servicio
ALTER TABLE "carro" ADD COLUMN IF NOT EXISTS "motivo_fuera_servicio" TEXT;
ALTER TABLE "carro" ADD COLUMN IF NOT EXISTS "fuera_servicio_desde" TIMESTAMPTZ(6);
