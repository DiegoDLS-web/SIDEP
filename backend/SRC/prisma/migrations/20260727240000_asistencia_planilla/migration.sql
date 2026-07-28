-- Planilla de asistencia: turno nocturno/diurno y estados como en Excel

ALTER TABLE "asistencia_cuartelero" ADD COLUMN IF NOT EXISTS "tipo_turno" VARCHAR(20) NOT NULL DEFAULT 'DIURNA';
ALTER TABLE "asistencia_cuartelero" ADD COLUMN IF NOT EXISTS "estado_asistencia" VARCHAR(30) NOT NULL DEFAULT 'ASISTE';

UPDATE "asistencia_cuartelero"
SET "estado_asistencia" = CASE WHEN "presente" = 1 THEN 'ASISTE' ELSE 'NO_ASISTE' END
WHERE "estado_asistencia" = 'ASISTE' AND "presente" = 0;

DROP INDEX IF EXISTS "asistencia_cuartelero_fecha_usuario_rut_key";
CREATE UNIQUE INDEX IF NOT EXISTS "asistencia_cuartelero_fecha_usuario_rut_tipo_turno_key"
  ON "asistencia_cuartelero"("fecha", "usuario_rut", "tipo_turno");
