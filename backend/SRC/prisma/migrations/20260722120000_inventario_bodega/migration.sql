-- Inventario central: stock en bodega y movimientos
CREATE TABLE "stock_bodega" (
    "id" SERIAL NOT NULL,
    "material_id" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 0,
    "stock_minimo" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_bodega_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "movimiento_bodega" (
    "id" VARCHAR(36) NOT NULL,
    "material_id" INTEGER NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "cantidad_antes" INTEGER NOT NULL,
    "cantidad_despues" INTEGER NOT NULL,
    "motivo" VARCHAR(255),
    "usuario_rut" VARCHAR(20),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimiento_bodega_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_bodega_material_id_key" ON "stock_bodega"("material_id");
CREATE INDEX "movimiento_bodega_material_id_idx" ON "movimiento_bodega"("material_id");
CREATE INDEX "movimiento_bodega_created_at_idx" ON "movimiento_bodega"("created_at");

ALTER TABLE "stock_bodega" ADD CONSTRAINT "stock_bodega_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "catalogo_material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimiento_bodega" ADD CONSTRAINT "movimiento_bodega_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "catalogo_material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimiento_bodega" ADD CONSTRAINT "movimiento_bodega_usuario_rut_fkey" FOREIGN KEY ("usuario_rut") REFERENCES "usuario"("rut") ON DELETE SET NULL ON UPDATE CASCADE;
