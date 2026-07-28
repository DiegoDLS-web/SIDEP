-- Invalida JWT emitidos antes de cambios sensibles (baja, reset contraseña, etc.)
ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "token_version" INTEGER NOT NULL DEFAULT 0;
