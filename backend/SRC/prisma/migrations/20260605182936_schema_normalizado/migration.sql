/*
  Warnings:

  - You are about to alter the column `codigo` on the `catalogo_cargo_oficialidad` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `nombre` on the `catalogo_cargo_oficialidad` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `codigo` on the `catalogo_estado_licencia` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `nombre` on the `catalogo_estado_licencia` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `descripcion` on the `catalogo_estado_licencia` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `codigo` on the `catalogo_estado_parte` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `nombre` on the `catalogo_estado_parte` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `descripcion` on the `catalogo_estado_parte` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `codigo` on the `catalogo_estado_voluntario` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `nombre` on the `catalogo_estado_voluntario` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `codigo` on the `catalogo_grupo_sanguineo` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `nombre` on the `catalogo_grupo_sanguineo` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to drop the column `created_at` on the `catalogo_material` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `catalogo_material` table. All the data in the column will be lost.
  - You are about to alter the column `codigo` on the `catalogo_material` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `nombre` on the `catalogo_material` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `categoria` on the `catalogo_material` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `unidad` on the `catalogo_material` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `codigo` on the `catalogo_tipo_voluntario` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `nombre` on the `catalogo_tipo_voluntario` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `codigo` on the `catalogo_triage` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `nombre` on the `catalogo_triage` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - The primary key for the `checklist_ejecucion` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `carro_id` on the `checklist_ejecucion` table. All the data in the column will be lost.
  - You are about to drop the column `cuartelero_id` on the `checklist_ejecucion` table. All the data in the column will be lost.
  - You are about to drop the column `fecha` on the `checklist_ejecucion` table. All the data in the column will be lost.
  - The primary key for the `checklist_plantilla` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `cantidad_objetivo` on the `checklist_plantilla` table. All the data in the column will be lost.
  - You are about to drop the column `carro_id` on the `checklist_plantilla` table. All the data in the column will be lost.
  - You are about to drop the column `material_id` on the `checklist_plantilla` table. All the data in the column will be lost.
  - You are about to drop the column `ubicacion` on the `checklist_plantilla` table. All the data in the column will be lost.
  - You are about to drop the `actividades_usuario` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `asistencia` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bolsos_trauma` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `carro_registro_historial` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `carros` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `catalogo_bolsos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `catalogo_claves_emergencia` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `checklist_material_resultado` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `configuracion_sistema` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `licencias_medicas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pacientes_emergencia` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `partes_emergencia` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `password_reset_tokens` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `roles_usuario` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `unidades_en_emergencia` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `usuarios` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `vehiculos_civiles_emergencia` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[codigo]` on the table `checklist_plantilla` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `activo` on the `catalogo_cargo_oficialidad` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `activo` on the `catalogo_estado_licencia` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `activo` on the `catalogo_estado_parte` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `activo` on the `catalogo_estado_voluntario` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `activo` on the `catalogo_grupo_sanguineo` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `activo` on the `catalogo_material` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `activo` on the `catalogo_tipo_voluntario` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `activo` on the `catalogo_triage` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `entidad_id` to the `checklist_ejecucion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entidad_tipo` to the `checklist_ejecucion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estado` to the `checklist_ejecucion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fecha_revision` to the `checklist_ejecucion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `plantilla_id` to the `checklist_ejecucion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `respuestas_json` to the `checklist_ejecucion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `revisor_rut` to the `checklist_ejecucion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `codigo` to the `checklist_plantilla` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entidad_tipo` to the `checklist_plantilla` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estructura_json` to the `checklist_plantilla` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nombre` to the `checklist_plantilla` table without a default value. This is not possible if the table is not empty.
  - Added the required column `version` to the `checklist_plantilla` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `activo` on the `checklist_plantilla` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "actividades_usuario" DROP CONSTRAINT "actividades_usuario_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "asistencia" DROP CONSTRAINT "asistencia_parte_id_fkey";

-- DropForeignKey
ALTER TABLE "asistencia" DROP CONSTRAINT "asistencia_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "bolsos_trauma" DROP CONSTRAINT "bolsos_trauma_carro_id_fkey";

-- DropForeignKey
ALTER TABLE "bolsos_trauma" DROP CONSTRAINT "bolsos_trauma_catalogo_bolso_id_fkey";

-- DropForeignKey
ALTER TABLE "carro_registro_historial" DROP CONSTRAINT "carro_registro_historial_carro_id_fkey";

-- DropForeignKey
ALTER TABLE "checklist_ejecucion" DROP CONSTRAINT "checklist_ejecucion_carro_id_fkey";

-- DropForeignKey
ALTER TABLE "checklist_ejecucion" DROP CONSTRAINT "checklist_ejecucion_cuartelero_id_fkey";

-- DropForeignKey
ALTER TABLE "checklist_material_resultado" DROP CONSTRAINT "checklist_material_resultado_checklist_id_fkey";

-- DropForeignKey
ALTER TABLE "checklist_material_resultado" DROP CONSTRAINT "checklist_material_resultado_material_id_fkey";

-- DropForeignKey
ALTER TABLE "checklist_plantilla" DROP CONSTRAINT "checklist_plantilla_carro_id_fkey";

-- DropForeignKey
ALTER TABLE "checklist_plantilla" DROP CONSTRAINT "checklist_plantilla_material_id_fkey";

-- DropForeignKey
ALTER TABLE "licencias_medicas" DROP CONSTRAINT "licencias_medicas_estado_id_fkey";

-- DropForeignKey
ALTER TABLE "licencias_medicas" DROP CONSTRAINT "licencias_medicas_resuelto_por_id_fkey";

-- DropForeignKey
ALTER TABLE "licencias_medicas" DROP CONSTRAINT "licencias_medicas_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "pacientes_emergencia" DROP CONSTRAINT "pacientes_emergencia_parte_id_fkey";

-- DropForeignKey
ALTER TABLE "pacientes_emergencia" DROP CONSTRAINT "pacientes_emergencia_triage_id_fkey";

-- DropForeignKey
ALTER TABLE "partes_emergencia" DROP CONSTRAINT "partes_emergencia_clave_id_fkey";

-- DropForeignKey
ALTER TABLE "partes_emergencia" DROP CONSTRAINT "partes_emergencia_estado_id_fkey";

-- DropForeignKey
ALTER TABLE "partes_emergencia" DROP CONSTRAINT "partes_emergencia_obac_id_fkey";

-- DropForeignKey
ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "password_reset_tokens_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "unidades_en_emergencia" DROP CONSTRAINT "unidades_en_emergencia_carro_id_fkey";

-- DropForeignKey
ALTER TABLE "unidades_en_emergencia" DROP CONSTRAINT "unidades_en_emergencia_parte_id_fkey";

-- DropForeignKey
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_cargo_oficialidad_id_fkey";

-- DropForeignKey
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_estado_voluntario_id_fkey";

-- DropForeignKey
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_grupo_sanguineo_id_fkey";

-- DropForeignKey
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_rol_id_fkey";

-- DropForeignKey
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_tipo_voluntario_id_fkey";

-- DropForeignKey
ALTER TABLE "vehiculos_civiles_emergencia" DROP CONSTRAINT "vehiculos_civiles_emergencia_parte_id_fkey";

-- AlterTable
ALTER TABLE "catalogo_cargo_oficialidad" ALTER COLUMN "codigo" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "nombre" SET DATA TYPE VARCHAR(100),
DROP COLUMN "activo",
ADD COLUMN     "activo" SMALLINT NOT NULL;

-- AlterTable
ALTER TABLE "catalogo_estado_licencia" ALTER COLUMN "codigo" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "nombre" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "descripcion" SET DATA TYPE VARCHAR(255),
DROP COLUMN "activo",
ADD COLUMN     "activo" SMALLINT NOT NULL;

-- AlterTable
ALTER TABLE "catalogo_estado_parte" ALTER COLUMN "codigo" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "nombre" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "descripcion" SET DATA TYPE VARCHAR(255),
DROP COLUMN "activo",
ADD COLUMN     "activo" SMALLINT NOT NULL;

-- AlterTable
ALTER TABLE "catalogo_estado_voluntario" ALTER COLUMN "codigo" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "nombre" SET DATA TYPE VARCHAR(100),
DROP COLUMN "activo",
ADD COLUMN     "activo" SMALLINT NOT NULL;

-- AlterTable
ALTER TABLE "catalogo_grupo_sanguineo" ALTER COLUMN "codigo" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "nombre" SET DATA TYPE VARCHAR(100),
DROP COLUMN "activo",
ADD COLUMN     "activo" SMALLINT NOT NULL;

-- AlterTable
ALTER TABLE "catalogo_material" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ALTER COLUMN "codigo" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "nombre" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "categoria" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "unidad" SET DATA TYPE VARCHAR(50),
DROP COLUMN "activo",
ADD COLUMN     "activo" SMALLINT NOT NULL;

-- AlterTable
ALTER TABLE "catalogo_tipo_voluntario" ALTER COLUMN "codigo" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "nombre" SET DATA TYPE VARCHAR(100),
DROP COLUMN "activo",
ADD COLUMN     "activo" SMALLINT NOT NULL;

-- AlterTable
ALTER TABLE "catalogo_triage" ADD COLUMN     "color" VARCHAR(50),
ALTER COLUMN "codigo" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "nombre" SET DATA TYPE VARCHAR(100),
DROP COLUMN "activo",
ADD COLUMN     "activo" SMALLINT NOT NULL;

-- AlterTable
ALTER TABLE "checklist_ejecucion" DROP CONSTRAINT "checklist_ejecucion_pkey",
DROP COLUMN "carro_id",
DROP COLUMN "cuartelero_id",
DROP COLUMN "fecha",
ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "entidad_id" VARCHAR(36) NOT NULL,
ADD COLUMN     "entidad_tipo" VARCHAR(50) NOT NULL,
ADD COLUMN     "estado" VARCHAR(30) NOT NULL,
ADD COLUMN     "fecha_revision" TIMESTAMPTZ NOT NULL,
ADD COLUMN     "firma_oficial" TEXT,
ADD COLUMN     "firma_revisor" TEXT,
ADD COLUMN     "plantilla_id" VARCHAR(36) NOT NULL,
ADD COLUMN     "respuestas_json" TEXT NOT NULL,
ADD COLUMN     "revisor_rut" VARCHAR(20) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(36),
ADD CONSTRAINT "checklist_ejecucion_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "checklist_ejecucion_id_seq";

-- AlterTable
ALTER TABLE "checklist_plantilla" DROP CONSTRAINT "checklist_plantilla_pkey",
DROP COLUMN "cantidad_objetivo",
DROP COLUMN "carro_id",
DROP COLUMN "material_id",
DROP COLUMN "ubicacion",
ADD COLUMN     "codigo" VARCHAR(50) NOT NULL,
ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "entidad_tipo" VARCHAR(50) NOT NULL,
ADD COLUMN     "estructura_json" TEXT NOT NULL,
ADD COLUMN     "nombre" VARCHAR(150) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(36),
DROP COLUMN "activo",
ADD COLUMN     "activo" SMALLINT NOT NULL,
ADD CONSTRAINT "checklist_plantilla_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "checklist_plantilla_id_seq";

-- DropTable
DROP TABLE "actividades_usuario";

-- DropTable
DROP TABLE "asistencia";

-- DropTable
DROP TABLE "bolsos_trauma";

-- DropTable
DROP TABLE "carro_registro_historial";

-- DropTable
DROP TABLE "carros";

-- DropTable
DROP TABLE "catalogo_bolsos";

-- DropTable
DROP TABLE "catalogo_claves_emergencia";

-- DropTable
DROP TABLE "checklist_material_resultado";

-- DropTable
DROP TABLE "configuracion_sistema";

-- DropTable
DROP TABLE "licencias_medicas";

-- DropTable
DROP TABLE "pacientes_emergencia";

-- DropTable
DROP TABLE "partes_emergencia";

-- DropTable
DROP TABLE "password_reset_tokens";

-- DropTable
DROP TABLE "roles_usuario";

-- DropTable
DROP TABLE "unidades_en_emergencia";

-- DropTable
DROP TABLE "usuarios";

-- DropTable
DROP TABLE "vehiculos_civiles_emergencia";

-- CreateTable
CREATE TABLE "rol_usuario" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "activo" SMALLINT NOT NULL,

    CONSTRAINT "rol_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo_bolso" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "activo" SMALLINT NOT NULL,

    CONSTRAINT "catalogo_bolso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo_clave_emergencia" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),
    "activo" SMALLINT NOT NULL,

    CONSTRAINT "catalogo_clave_emergencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "rut" VARCHAR(20) NOT NULL,
    "nombres" VARCHAR(100) NOT NULL,
    "apellido_paterno" VARCHAR(100) NOT NULL,
    "apellido_materno" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "firma_imagen" TEXT,
    "foto_perfil" TEXT,
    "rol_id" INTEGER NOT NULL,
    "cargo_id" INTEGER,
    "tipo_voluntario_id" INTEGER,
    "estado_voluntario_id" INTEGER,
    "grupo_sanguineo_id" INTEGER,
    "compania" VARCHAR(100),
    "cuerpo_bombero" VARCHAR(150),
    "activo" SMALLINT NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("rut")
);

-- CreateTable
CREATE TABLE "carro" (
    "id" VARCHAR(36) NOT NULL,
    "patente" VARCHAR(20),
    "nomenclatura" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "marca" VARCHAR(100),
    "kilometraje" DECIMAL(10,1),
    "estado_operativo" SMALLINT NOT NULL,

    CONSTRAINT "carro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parte_emergencia" (
    "id" VARCHAR(36) NOT NULL,
    "correlativo" VARCHAR(50) NOT NULL,
    "estado_id" INTEGER NOT NULL,
    "fecha_emergencia" TIMESTAMPTZ NOT NULL,
    "clave_id" INTEGER NOT NULL,
    "obac_rut" VARCHAR(20) NOT NULL,
    "direccion" VARCHAR(200) NOT NULL,
    "referencia_lugar" VARCHAR(255),
    "trabajo_realizado" TEXT,
    "material_utilizado" TEXT,
    "metadata" TEXT,
    "firma_obac" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parte_emergencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paciente_emergencia" (
    "id" VARCHAR(36) NOT NULL,
    "parte_id" VARCHAR(36) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "rut_paciente" VARCHAR(20),
    "triage_id" INTEGER NOT NULL,

    CONSTRAINT "paciente_emergencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehiculo_civil_emergencia" (
    "id" VARCHAR(36) NOT NULL,
    "parte_id" VARCHAR(36) NOT NULL,
    "patente" VARCHAR(20),
    "marca" VARCHAR(50),
    "conductor" VARCHAR(150),
    "rut_conductor" VARCHAR(20),

    CONSTRAINT "vehiculo_civil_emergencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asistencia_personal" (
    "id" VARCHAR(36) NOT NULL,
    "parte_id" VARCHAR(36) NOT NULL,
    "usuario_rut" VARCHAR(20) NOT NULL,

    CONSTRAINT "asistencia_personal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidad_en_emergencia" (
    "id" VARCHAR(36) NOT NULL,
    "parte_id" VARCHAR(36) NOT NULL,
    "carro_id" VARCHAR(36) NOT NULL,
    "conductor_rut" VARCHAR(20),
    "hora_salida" TIMESTAMPTZ NOT NULL,
    "hora_llegada" TIMESTAMPTZ NOT NULL,
    "km_salida" DECIMAL(10,1) NOT NULL,
    "km_llegada" DECIMAL(10,1) NOT NULL,

    CONSTRAINT "unidad_en_emergencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_por_carro" (
    "id" VARCHAR(36) NOT NULL,
    "carro_id" VARCHAR(36) NOT NULL,
    "material_id" INTEGER NOT NULL,
    "cantidad_objetivo" INTEGER NOT NULL,
    "ubicacion" VARCHAR(100),
    "activo" SMALLINT NOT NULL,

    CONSTRAINT "material_por_carro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bolso_trauma" (
    "id" VARCHAR(36) NOT NULL,
    "tipo_id" INTEGER NOT NULL,
    "carro_id" VARCHAR(36) NOT NULL,
    "nombre_identificador" VARCHAR(100),
    "activo" SMALLINT NOT NULL,

    CONSTRAINT "bolso_trauma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mantenimiento_carro" (
    "id" VARCHAR(36) NOT NULL,
    "carro_id" VARCHAR(36) NOT NULL,
    "fecha_registro" TIMESTAMPTZ NOT NULL,
    "fecha_mantenimiento" DATE,
    "fecha_proximo_mantenimiento" DATE,
    "fecha_proxima_rev_tecnica" DATE,
    "fecha_rev_bomba" DATE,
    "fecha_inspeccion" DATE,
    "inspector_rut" VARCHAR(20),
    "conductor_rut" VARCHAR(20),
    "descripcion" TEXT,

    CONSTRAINT "mantenimiento_carro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licencia_medica" (
    "id" VARCHAR(36) NOT NULL,
    "usuario_rut" VARCHAR(20) NOT NULL,
    "resolutor_rut" VARCHAR(20),
    "estado_licencia_id" INTEGER NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_termino" DATE NOT NULL,
    "motivo" VARCHAR(255) NOT NULL,
    "archivo_url" VARCHAR(255),
    "observacion_resolucion" TEXT,
    "resuelto_en" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "licencia_medica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria_usuario" (
    "id" VARCHAR(36) NOT NULL,
    "usuario_rut" VARCHAR(20),
    "accion" VARCHAR(100) NOT NULL,
    "entidad" VARCHAR(100),
    "entidad_id" VARCHAR(36),
    "metodo_http" VARCHAR(10),
    "ruta" VARCHAR(255),
    "ip_origen" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "detalle" TEXT,
    "resultado" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rol_usuario_codigo_key" ON "rol_usuario"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_bolso_codigo_key" ON "catalogo_bolso"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_clave_emergencia_codigo_key" ON "catalogo_clave_emergencia"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "carro_patente_key" ON "carro"("patente");

-- CreateIndex
CREATE UNIQUE INDEX "carro_nomenclatura_key" ON "carro"("nomenclatura");

-- CreateIndex
CREATE UNIQUE INDEX "parte_emergencia_correlativo_key" ON "parte_emergencia"("correlativo");

-- CreateIndex
CREATE UNIQUE INDEX "asistencia_personal_parte_id_usuario_rut_key" ON "asistencia_personal"("parte_id", "usuario_rut");

-- CreateIndex
CREATE UNIQUE INDEX "material_por_carro_carro_id_material_id_ubicacion_key" ON "material_por_carro"("carro_id", "material_id", "ubicacion");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_plantilla_codigo_key" ON "checklist_plantilla"("codigo");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "rol_usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "catalogo_cargo_oficialidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_tipo_voluntario_id_fkey" FOREIGN KEY ("tipo_voluntario_id") REFERENCES "catalogo_tipo_voluntario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_estado_voluntario_id_fkey" FOREIGN KEY ("estado_voluntario_id") REFERENCES "catalogo_estado_voluntario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_grupo_sanguineo_id_fkey" FOREIGN KEY ("grupo_sanguineo_id") REFERENCES "catalogo_grupo_sanguineo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parte_emergencia" ADD CONSTRAINT "parte_emergencia_estado_id_fkey" FOREIGN KEY ("estado_id") REFERENCES "catalogo_estado_parte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parte_emergencia" ADD CONSTRAINT "parte_emergencia_clave_id_fkey" FOREIGN KEY ("clave_id") REFERENCES "catalogo_clave_emergencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parte_emergencia" ADD CONSTRAINT "parte_emergencia_obac_rut_fkey" FOREIGN KEY ("obac_rut") REFERENCES "usuario"("rut") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paciente_emergencia" ADD CONSTRAINT "paciente_emergencia_parte_id_fkey" FOREIGN KEY ("parte_id") REFERENCES "parte_emergencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paciente_emergencia" ADD CONSTRAINT "paciente_emergencia_triage_id_fkey" FOREIGN KEY ("triage_id") REFERENCES "catalogo_triage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehiculo_civil_emergencia" ADD CONSTRAINT "vehiculo_civil_emergencia_parte_id_fkey" FOREIGN KEY ("parte_id") REFERENCES "parte_emergencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencia_personal" ADD CONSTRAINT "asistencia_personal_parte_id_fkey" FOREIGN KEY ("parte_id") REFERENCES "parte_emergencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencia_personal" ADD CONSTRAINT "asistencia_personal_usuario_rut_fkey" FOREIGN KEY ("usuario_rut") REFERENCES "usuario"("rut") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidad_en_emergencia" ADD CONSTRAINT "unidad_en_emergencia_carro_id_fkey" FOREIGN KEY ("carro_id") REFERENCES "carro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidad_en_emergencia" ADD CONSTRAINT "unidad_en_emergencia_parte_id_fkey" FOREIGN KEY ("parte_id") REFERENCES "parte_emergencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidad_en_emergencia" ADD CONSTRAINT "unidad_en_emergencia_conductor_rut_fkey" FOREIGN KEY ("conductor_rut") REFERENCES "usuario"("rut") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_por_carro" ADD CONSTRAINT "material_por_carro_carro_id_fkey" FOREIGN KEY ("carro_id") REFERENCES "carro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_por_carro" ADD CONSTRAINT "material_por_carro_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "catalogo_material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bolso_trauma" ADD CONSTRAINT "bolso_trauma_tipo_id_fkey" FOREIGN KEY ("tipo_id") REFERENCES "catalogo_bolso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bolso_trauma" ADD CONSTRAINT "bolso_trauma_carro_id_fkey" FOREIGN KEY ("carro_id") REFERENCES "carro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_ejecucion" ADD CONSTRAINT "checklist_ejecucion_plantilla_id_fkey" FOREIGN KEY ("plantilla_id") REFERENCES "checklist_plantilla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_ejecucion" ADD CONSTRAINT "checklist_ejecucion_revisor_rut_fkey" FOREIGN KEY ("revisor_rut") REFERENCES "usuario"("rut") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mantenimiento_carro" ADD CONSTRAINT "mantenimiento_carro_carro_id_fkey" FOREIGN KEY ("carro_id") REFERENCES "carro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mantenimiento_carro" ADD CONSTRAINT "mantenimiento_carro_inspector_rut_fkey" FOREIGN KEY ("inspector_rut") REFERENCES "usuario"("rut") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mantenimiento_carro" ADD CONSTRAINT "mantenimiento_carro_conductor_rut_fkey" FOREIGN KEY ("conductor_rut") REFERENCES "usuario"("rut") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licencia_medica" ADD CONSTRAINT "licencia_medica_estado_licencia_id_fkey" FOREIGN KEY ("estado_licencia_id") REFERENCES "catalogo_estado_licencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licencia_medica" ADD CONSTRAINT "licencia_medica_usuario_rut_fkey" FOREIGN KEY ("usuario_rut") REFERENCES "usuario"("rut") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licencia_medica" ADD CONSTRAINT "licencia_medica_resolutor_rut_fkey" FOREIGN KEY ("resolutor_rut") REFERENCES "usuario"("rut") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_usuario" ADD CONSTRAINT "auditoria_usuario_usuario_rut_fkey" FOREIGN KEY ("usuario_rut") REFERENCES "usuario"("rut") ON DELETE SET NULL ON UPDATE CASCADE;
