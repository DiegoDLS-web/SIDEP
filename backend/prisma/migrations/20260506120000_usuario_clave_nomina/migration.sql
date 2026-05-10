-- Clave de nómina (ej. 133, 106-A) para búsqueda de OBAC y visualización en perfil.
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "claveNomina" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_claveNomina_key" ON "Usuario"("claveNomina");
