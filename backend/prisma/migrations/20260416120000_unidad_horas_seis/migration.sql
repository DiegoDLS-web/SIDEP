-- Horarios 6-0, 6-3, 6-9, 6-10 por unidad (además de horaSalida/horaLlegada legado).
ALTER TABLE "UnidadEnEmergencia" ADD COLUMN IF NOT EXISTS "hora6_0" TEXT NOT NULL DEFAULT '00:00';
ALTER TABLE "UnidadEnEmergencia" ADD COLUMN IF NOT EXISTS "hora6_3" TEXT NOT NULL DEFAULT '00:00';
ALTER TABLE "UnidadEnEmergencia" ADD COLUMN IF NOT EXISTS "hora6_9" TEXT NOT NULL DEFAULT '00:00';
ALTER TABLE "UnidadEnEmergencia" ADD COLUMN IF NOT EXISTS "hora6_10" TEXT NOT NULL DEFAULT '00:00';

UPDATE "UnidadEnEmergencia"
SET
  "hora6_0" = "horaSalida",
  "hora6_10" = "horaLlegada";
