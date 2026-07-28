-- Contraseña provisional: obligar cambio al primer ingreso
ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "requiere_cambio_password" SMALLINT NOT NULL DEFAULT 0;
