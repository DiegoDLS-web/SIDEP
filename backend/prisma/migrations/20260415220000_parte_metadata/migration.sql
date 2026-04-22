-- Detalle extendido del parte y datos adicionales de pacientes
ALTER TABLE "ParteEmergencia" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "PacienteEmergencia" ADD COLUMN IF NOT EXISTS "edad" INTEGER;
ALTER TABLE "PacienteEmergencia" ADD COLUMN IF NOT EXISTS "rut" TEXT;
