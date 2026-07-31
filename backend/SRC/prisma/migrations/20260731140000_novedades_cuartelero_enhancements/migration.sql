-- Novedades: oficial a cargo + imágenes opcionales
ALTER TABLE "libro_novedad" ADD COLUMN IF NOT EXISTS "oficial_a_cargo_rut" VARCHAR(20);
ALTER TABLE "libro_novedad" ADD COLUMN IF NOT EXISTS "imagenes_json" TEXT;

UPDATE "libro_novedad"
SET "oficial_a_cargo_rut" = "autor_rut"
WHERE "oficial_a_cargo_rut" IS NULL;

ALTER TABLE "libro_novedad"
  ALTER COLUMN "oficial_a_cargo_rut" SET NOT NULL;

ALTER TABLE "libro_novedad"
  ALTER COLUMN "categoria" SET DEFAULT 'OTRO';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'libro_novedad_oficial_a_cargo_rut_fkey'
  ) THEN
    ALTER TABLE "libro_novedad"
      ADD CONSTRAINT "libro_novedad_oficial_a_cargo_rut_fkey"
      FOREIGN KEY ("oficial_a_cargo_rut") REFERENCES "usuario"("rut")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "libro_novedad_oficial_a_cargo_rut_idx"
  ON "libro_novedad"("oficial_a_cargo_rut");

-- Asistencia cuartelero: firma
ALTER TABLE "asistencia_cuartelero" ADD COLUMN IF NOT EXISTS "firma_imagen_url" TEXT;
ALTER TABLE "asistencia_cuartelero" ADD COLUMN IF NOT EXISTS "firma_imagen_public_id" VARCHAR(255);

CREATE INDEX IF NOT EXISTS "asistencia_cuartelero_estado_asistencia_idx"
  ON "asistencia_cuartelero"("estado_asistencia");
