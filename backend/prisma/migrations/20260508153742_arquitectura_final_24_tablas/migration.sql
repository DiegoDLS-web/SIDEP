/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `configuracion_sistema` table. All the data in the column will be lost.
  - You are about to drop the column `hora6_0` on the `unidades_en_emergencia` table. All the data in the column will be lost.
  - You are about to drop the column `hora6_10` on the `unidades_en_emergencia` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `configuracion_sistema` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `usuarios` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "configuracion_sistema" DROP COLUMN "updatedAt",
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "unidades_en_emergencia" DROP COLUMN "hora6_0",
DROP COLUMN "hora6_10",
ADD COLUMN     "hora_6_0" TEXT NOT NULL DEFAULT '00:00',
ADD COLUMN     "hora_6_10" TEXT NOT NULL DEFAULT '00:00';

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "tipo_voluntario_id" INTEGER,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "catalogo_tipo_voluntario" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "catalogo_tipo_voluntario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo_material" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT,
    "unidad" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalogo_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asistencia" (
    "id" SERIAL NOT NULL,
    "parte_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "rol_en_emergencia" TEXT,
    "estado" TEXT,
    "hora_llegada" TEXT,
    "hora_salida" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asistencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_por_carro" (
    "id" SERIAL NOT NULL,
    "carro_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "cantidad_objetivo" INTEGER NOT NULL,
    "ubicacion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "material_por_carro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_material_resultado" (
    "id" SERIAL NOT NULL,
    "checklist_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "cantidad_encontrada" INTEGER NOT NULL,
    "estado_item" TEXT,
    "observacion" TEXT,

    CONSTRAINT "checklist_material_resultado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_tipo_voluntario_codigo_key" ON "catalogo_tipo_voluntario"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_material_codigo_key" ON "catalogo_material"("codigo");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_tipo_voluntario_id_fkey" FOREIGN KEY ("tipo_voluntario_id") REFERENCES "catalogo_tipo_voluntario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencia" ADD CONSTRAINT "asistencia_parte_id_fkey" FOREIGN KEY ("parte_id") REFERENCES "partes_emergencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencia" ADD CONSTRAINT "asistencia_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_por_carro" ADD CONSTRAINT "material_por_carro_carro_id_fkey" FOREIGN KEY ("carro_id") REFERENCES "carros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_por_carro" ADD CONSTRAINT "material_por_carro_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "catalogo_material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_material_resultado" ADD CONSTRAINT "checklist_material_resultado_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "checklists_carro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_material_resultado" ADD CONSTRAINT "checklist_material_resultado_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "catalogo_material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
