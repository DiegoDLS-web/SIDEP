-- Tallas y tipo EPP para inventario institucional
ALTER TABLE "inventario_item" ADD COLUMN IF NOT EXISTS "tipo_epp" VARCHAR(80);
ALTER TABLE "inventario_item" ADD COLUMN IF NOT EXISTS "talla" VARCHAR(10);
ALTER TABLE "inventario_item" ADD COLUMN IF NOT EXISTS "sistema_talla" VARCHAR(20);

CREATE INDEX IF NOT EXISTS "inventario_item_tipo_epp_idx" ON "inventario_item"("tipo_epp");
CREATE INDEX IF NOT EXISTS "inventario_item_talla_idx" ON "inventario_item"("talla");

-- Una sola asignación del mismo ítem por voluntario
CREATE UNIQUE INDEX IF NOT EXISTS "asignacion_inventario_epp_item_rut_key"
  ON "asignacion_inventario_epp"("inventario_item_id", "usuario_rut");
