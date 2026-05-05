-- Firma manuscrita del inspector (además de firma OBAC) en checklists unidad/ERA/trauma
ALTER TABLE "ChecklistCarro" ADD COLUMN IF NOT EXISTS "firmaInspector" TEXT;
