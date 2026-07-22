-- Inventario institucional: bodegas, ítems, asignación EPP y movimientos
CREATE TABLE "catalogo_bodega" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "activo" SMALLINT NOT NULL,

    CONSTRAINT "catalogo_bodega_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventario_item" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "categoria" VARCHAR(100),
    "tipo_inventario" VARCHAR(80),
    "bodega_id" INTEGER NOT NULL,
    "marca" VARCHAR(100),
    "modelo" VARCHAR(100),
    "estado_fisico" VARCHAR(50),
    "valor" DECIMAL(14,2),
    "observaciones" TEXT,
    "unidad" VARCHAR(50) NOT NULL DEFAULT 'unidades',
    "cantidad" INTEGER NOT NULL DEFAULT 0,
    "stock_minimo" INTEGER NOT NULL DEFAULT 0,
    "stock_critico" INTEGER NOT NULL DEFAULT 0,
    "es_epp_asignable" SMALLINT NOT NULL DEFAULT 0,
    "activo" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventario_item_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "asignacion_inventario_epp" (
    "id" VARCHAR(36) NOT NULL,
    "inventario_item_id" INTEGER NOT NULL,
    "usuario_rut" VARCHAR(20) NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "observaciones" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asignacion_inventario_epp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventario_movimiento" (
    "id" VARCHAR(36) NOT NULL,
    "inventario_item_id" INTEGER NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "cantidad_antes" INTEGER NOT NULL,
    "cantidad_despues" INTEGER NOT NULL,
    "motivo" VARCHAR(255),
    "usuario_rut" VARCHAR(20),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventario_movimiento_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "catalogo_bodega_codigo_key" ON "catalogo_bodega"("codigo");
CREATE UNIQUE INDEX "inventario_item_codigo_key" ON "inventario_item"("codigo");
CREATE INDEX "inventario_item_bodega_id_idx" ON "inventario_item"("bodega_id");
CREATE INDEX "inventario_item_categoria_idx" ON "inventario_item"("categoria");
CREATE INDEX "inventario_item_tipo_inventario_idx" ON "inventario_item"("tipo_inventario");
CREATE INDEX "asignacion_inventario_epp_usuario_rut_idx" ON "asignacion_inventario_epp"("usuario_rut");
CREATE INDEX "asignacion_inventario_epp_inventario_item_id_idx" ON "asignacion_inventario_epp"("inventario_item_id");
CREATE INDEX "inventario_movimiento_inventario_item_id_idx" ON "inventario_movimiento"("inventario_item_id");
CREATE INDEX "inventario_movimiento_created_at_idx" ON "inventario_movimiento"("created_at");

ALTER TABLE "inventario_item" ADD CONSTRAINT "inventario_item_bodega_id_fkey" FOREIGN KEY ("bodega_id") REFERENCES "catalogo_bodega"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asignacion_inventario_epp" ADD CONSTRAINT "asignacion_inventario_epp_inventario_item_id_fkey" FOREIGN KEY ("inventario_item_id") REFERENCES "inventario_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "asignacion_inventario_epp" ADD CONSTRAINT "asignacion_inventario_epp_usuario_rut_fkey" FOREIGN KEY ("usuario_rut") REFERENCES "usuario"("rut") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventario_movimiento" ADD CONSTRAINT "inventario_movimiento_inventario_item_id_fkey" FOREIGN KEY ("inventario_item_id") REFERENCES "inventario_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventario_movimiento" ADD CONSTRAINT "inventario_movimiento_usuario_rut_fkey" FOREIGN KEY ("usuario_rut") REFERENCES "usuario"("rut") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "catalogo_bodega" ("codigo", "nombre", "activo") VALUES
  ('RESCATE', 'Bodega Rescate', 1),
  ('AGUA', 'Bodega Agua', 1),
  ('UNIFORMES', 'Bodega Uniformes', 1);
