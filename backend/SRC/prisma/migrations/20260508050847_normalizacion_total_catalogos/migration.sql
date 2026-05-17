/*
  Warnings:

  - You are about to drop the column `estado` on the `licencias_medicas` table. All the data in the column will be lost.
  - You are about to drop the column `triage` on the `pacientes_emergencia` table. All the data in the column will be lost.
  - You are about to drop the column `estado` on the `partes_emergencia` table. All the data in the column will be lost.
  - You are about to drop the column `cargo_oficialidad` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `estado_voluntario` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `grupo_sanguineo` on the `usuarios` table. All the data in the column will be lost.
  - Added the required column `estado_id` to the `licencias_medicas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `triage_id` to the `pacientes_emergencia` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estado_id` to the `partes_emergencia` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "licencias_medicas" DROP COLUMN "estado",
ADD COLUMN     "estado_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "pacientes_emergencia" DROP COLUMN "triage",
ADD COLUMN     "triage_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "partes_emergencia" DROP COLUMN "estado",
ADD COLUMN     "estado_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "usuarios" DROP COLUMN "cargo_oficialidad",
DROP COLUMN "estado_voluntario",
DROP COLUMN "grupo_sanguineo",
ADD COLUMN     "cargo_oficialidad_id" INTEGER,
ADD COLUMN     "estado_voluntario_id" INTEGER,
ADD COLUMN     "grupo_sanguineo_id" INTEGER;

-- CreateTable
CREATE TABLE "catalogo_estado_parte" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "catalogo_estado_parte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo_triage" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "catalogo_triage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo_grupo_sanguineo" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "catalogo_grupo_sanguineo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo_estado_voluntario" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "catalogo_estado_voluntario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo_cargo_oficialidad" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "catalogo_cargo_oficialidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo_estado_licencia" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "catalogo_estado_licencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_estado_parte_codigo_key" ON "catalogo_estado_parte"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_triage_codigo_key" ON "catalogo_triage"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_grupo_sanguineo_codigo_key" ON "catalogo_grupo_sanguineo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_estado_voluntario_codigo_key" ON "catalogo_estado_voluntario"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_cargo_oficialidad_codigo_key" ON "catalogo_cargo_oficialidad"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_estado_licencia_codigo_key" ON "catalogo_estado_licencia"("codigo");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_grupo_sanguineo_id_fkey" FOREIGN KEY ("grupo_sanguineo_id") REFERENCES "catalogo_grupo_sanguineo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_estado_voluntario_id_fkey" FOREIGN KEY ("estado_voluntario_id") REFERENCES "catalogo_estado_voluntario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_cargo_oficialidad_id_fkey" FOREIGN KEY ("cargo_oficialidad_id") REFERENCES "catalogo_cargo_oficialidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partes_emergencia" ADD CONSTRAINT "partes_emergencia_estado_id_fkey" FOREIGN KEY ("estado_id") REFERENCES "catalogo_estado_parte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licencias_medicas" ADD CONSTRAINT "licencias_medicas_estado_id_fkey" FOREIGN KEY ("estado_id") REFERENCES "catalogo_estado_licencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pacientes_emergencia" ADD CONSTRAINT "pacientes_emergencia_triage_id_fkey" FOREIGN KEY ("triage_id") REFERENCES "catalogo_triage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
