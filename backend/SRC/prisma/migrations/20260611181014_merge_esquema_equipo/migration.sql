/*
  Warnings:

  - A unique constraint covering the columns `[clave_nomina]` on the table `usuario` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "autorizado_conducir" SMALLINT DEFAULT 0,
ADD COLUMN     "clave_nomina" VARCHAR(50),
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fecha_ingreso" DATE,
ADD COLUMN     "fecha_nacimiento" DATE,
ADD COLUMN     "nacionalidad" VARCHAR(100),
ADD COLUMN     "observaciones_registro" TEXT,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "configuracion_sistema" (
    "id" SERIAL NOT NULL,
    "nombre_compania" VARCHAR(150) NOT NULL,
    "nombre_bomba" VARCHAR(150),
    "direccion" VARCHAR(255),
    "telefono" VARCHAR(50),
    "email_institucional" VARCHAR(150),
    "fecha_fundacion" DATE,
    "logo_url" TEXT,
    "logo_public_id" TEXT,
    "alertas_emergencia" SMALLINT NOT NULL DEFAULT 1,
    "alertas_inventario" SMALLINT NOT NULL DEFAULT 1,
    "recordatorios_checklist" SMALLINT NOT NULL DEFAULT 1,
    "resumen_diario_email" SMALLINT NOT NULL DEFAULT 1,
    "formato_predeterminado" VARCHAR(10) NOT NULL DEFAULT 'PDF',
    "logos_pdf" VARCHAR(20) NOT NULL DEFAULT 'AMBOS',
    "orientacion_pdf" VARCHAR(20) NOT NULL DEFAULT 'VERTICAL',
    "navegacion_por_rol" TEXT,
    "tipos_emergencia" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "configuracion_sistema_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_clave_nomina_key" ON "usuario"("clave_nomina");
