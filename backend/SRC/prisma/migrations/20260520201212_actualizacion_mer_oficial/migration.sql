/*
  Warnings:

  - You are about to drop the `checklists_carro` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `material_por_carro` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "checklist_material_resultado" DROP CONSTRAINT "checklist_material_resultado_checklist_id_fkey";

-- DropForeignKey
ALTER TABLE "checklists_carro" DROP CONSTRAINT "checklists_carro_carro_id_fkey";

-- DropForeignKey
ALTER TABLE "checklists_carro" DROP CONSTRAINT "checklists_carro_cuartelero_id_fkey";

-- DropForeignKey
ALTER TABLE "material_por_carro" DROP CONSTRAINT "material_por_carro_carro_id_fkey";

-- DropForeignKey
ALTER TABLE "material_por_carro" DROP CONSTRAINT "material_por_carro_material_id_fkey";

-- DropTable
DROP TABLE "checklists_carro";

-- DropTable
DROP TABLE "material_por_carro";

-- CreateTable
CREATE TABLE "vehiculos_civiles_emergencia" (
    "id" SERIAL NOT NULL,
    "parte_id" INTEGER NOT NULL,
    "tipo_vehiculo" TEXT,
    "patente" TEXT,
    "marca" TEXT,
    "conductor" TEXT,
    "rut_conductor" TEXT,

    CONSTRAINT "vehiculos_civiles_emergencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_plantilla" (
    "id" SERIAL NOT NULL,
    "carro_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "cantidad_objetivo" INTEGER NOT NULL,
    "ubicacion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "checklist_plantilla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_ejecucion" (
    "id" SERIAL NOT NULL,
    "carro_id" INTEGER NOT NULL,
    "cuartelero_id" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_ejecucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo_bolsos" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "catalogo_bolsos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bolsos_trauma" (
    "id" SERIAL NOT NULL,
    "catalogo_bolso_id" INTEGER NOT NULL,
    "carro_id" INTEGER,
    "numero_serie" TEXT,
    "estado_operativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "bolsos_trauma_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_bolsos_codigo_key" ON "catalogo_bolsos"("codigo");

-- AddForeignKey
ALTER TABLE "vehiculos_civiles_emergencia" ADD CONSTRAINT "vehiculos_civiles_emergencia_parte_id_fkey" FOREIGN KEY ("parte_id") REFERENCES "partes_emergencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_plantilla" ADD CONSTRAINT "checklist_plantilla_carro_id_fkey" FOREIGN KEY ("carro_id") REFERENCES "carros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_plantilla" ADD CONSTRAINT "checklist_plantilla_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "catalogo_material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_ejecucion" ADD CONSTRAINT "checklist_ejecucion_carro_id_fkey" FOREIGN KEY ("carro_id") REFERENCES "carros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_ejecucion" ADD CONSTRAINT "checklist_ejecucion_cuartelero_id_fkey" FOREIGN KEY ("cuartelero_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_material_resultado" ADD CONSTRAINT "checklist_material_resultado_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "checklist_ejecucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bolsos_trauma" ADD CONSTRAINT "bolsos_trauma_catalogo_bolso_id_fkey" FOREIGN KEY ("catalogo_bolso_id") REFERENCES "catalogo_bolsos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bolsos_trauma" ADD CONSTRAINT "bolsos_trauma_carro_id_fkey" FOREIGN KEY ("carro_id") REFERENCES "carros"("id") ON DELETE SET NULL ON UPDATE CASCADE;
