/*
  Warnings:

  - You are about to drop the column `detalle` on the `actividades_usuario` table. All the data in the column will be lost.
  - You are about to drop the column `referencia` on the `actividades_usuario` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion_ultimo_mantenimiento` on the `carro_registro_historial` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_ultima_inspeccion` on the `carro_registro_historial` table. All the data in the column will be lost.
  - You are about to drop the column `firma_ultimo_inspector` on the `carro_registro_historial` table. All the data in the column will be lost.
  - You are about to drop the column `proxima_revision_tecnica` on the `carro_registro_historial` table. All the data in the column will be lost.
  - You are about to drop the column `proximo_mantenimiento` on the `carro_registro_historial` table. All the data in the column will be lost.
  - You are about to drop the column `ultima_revision_bomba_agua` on the `carro_registro_historial` table. All the data in the column will be lost.
  - You are about to drop the column `ultimo_conductor` on the `carro_registro_historial` table. All the data in the column will be lost.
  - You are about to drop the column `ultimo_inspector` on the `carro_registro_historial` table. All the data in the column will be lost.
  - You are about to drop the column `ultimo_mantenimiento` on the `carro_registro_historial` table. All the data in the column will be lost.
  - You are about to drop the column `anio_fabricacion` on the `carros` table. All the data in the column will be lost.
  - You are about to drop the column `capacidad_tanque_combustible` on the `carros` table. All the data in the column will be lost.
  - You are about to drop the column `combustible` on the `carros` table. All the data in the column will be lost.
  - You are about to drop the column `conductor_asignado` on the `carros` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion_ultimo_mantenimiento` on the `carros` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_ultima_inspeccion` on the `carros` table. All the data in the column will be lost.
  - You are about to drop the column `firma_ultimo_inspector` on the `carros` table. All the data in the column will be lost.
  - You are about to drop the column `imagen_url` on the `carros` table. All the data in the column will be lost.
  - You are about to drop the column `marca` on the `carros` table. All the data in the column will be lost.
  - You are about to drop the column `motor` on the `carros` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `carros` table. All the data in the column will be lost.
  - You are about to drop the column `presion_bomba` on the `carros` table. All the data in the column will be lost.
  - You are about to drop the column `proxima_revision_tecnica` on the `carros` table. All the data in the column will be lost.
  - You are about to drop the column `proximo_mantenimiento` on the `carros` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `carros` table. All the data in the column will be lost.
  - You are about to drop the column `transmision` on the `carros` table. All the data in the column will be lost.
  - You are about to drop the column `ultima_revision_bomba_agua` on the `carros` table. All the data in the column will be lost.
  - You are about to drop the column `ultimo_conductor` on the `carros` table. All the data in the column will be lost.
  - You are about to drop the column `ultimo_inspector` on the `carros` table. All the data in the column will be lost.
  - You are about to drop the column `ultimo_mantenimiento` on the `carros` table. All the data in the column will be lost.
  - You are about to drop the column `detalle` on the `checklists_carro` table. All the data in the column will be lost.
  - You are about to drop the column `firma_inspector` on the `checklists_carro` table. All the data in the column will be lost.
  - You are about to drop the column `firma_oficial` on the `checklists_carro` table. All the data in the column will be lost.
  - You are about to drop the column `grupo_guardia` on the `checklists_carro` table. All the data in the column will be lost.
  - You are about to drop the column `inspector` on the `checklists_carro` table. All the data in the column will be lost.
  - You are about to drop the column `items_ok` on the `checklists_carro` table. All the data in the column will be lost.
  - You are about to drop the column `observaciones` on the `checklists_carro` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `checklists_carro` table. All the data in the column will be lost.
  - You are about to drop the column `total_items` on the `checklists_carro` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `configuracion_sistema` table. All the data in the column will be lost.
  - You are about to drop the column `archivo_url` on the `licencias_medicas` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `licencias_medicas` table. All the data in the column will be lost.
  - You are about to drop the column `observacion_resolucion` on the `licencias_medicas` table. All the data in the column will be lost.
  - You are about to drop the column `resuelto_en` on the `licencias_medicas` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `licencias_medicas` table. All the data in the column will be lost.
  - You are about to drop the column `edad` on the `pacientes_emergencia` table. All the data in the column will be lost.
  - You are about to drop the column `rut` on the `pacientes_emergencia` table. All the data in the column will be lost.
  - You are about to drop the column `clave_emergencia` on the `partes_emergencia` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `password_reset_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `used_at` on the `password_reset_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `hora6_3` on the `unidades_en_emergencia` table. All the data in the column will be lost.
  - You are about to drop the column `hora6_9` on the `unidades_en_emergencia` table. All the data in the column will be lost.
  - You are about to drop the column `actividad` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `clave_nomina` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `compania` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `comuna` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `cuerpo_bombero` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `direccion` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_ingreso` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_nacimiento` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `firma_imagen` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `nacionalidad` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `observaciones_registro` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `region` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `rol` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `tipo_voluntario` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `usuarios` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `configuracion_sistema` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clave_id` to the `partes_emergencia` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rol_id` to the `usuarios` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "carro_registro_historial_carro_id_idx";

-- DropIndex
DROP INDEX "licencias_medicas_estado_fecha_inicio_fecha_termino_idx";

-- DropIndex
DROP INDEX "licencias_medicas_usuario_id_fecha_inicio_fecha_termino_idx";

-- DropIndex
DROP INDEX "partes_emergencia_clave_emergencia_fecha_idx";

-- DropIndex
DROP INDEX "usuarios_clave_nomina_key";

-- AlterTable
ALTER TABLE "actividades_usuario" DROP COLUMN "detalle",
DROP COLUMN "referencia";

-- AlterTable
ALTER TABLE "carro_registro_historial" DROP COLUMN "descripcion_ultimo_mantenimiento",
DROP COLUMN "fecha_ultima_inspeccion",
DROP COLUMN "firma_ultimo_inspector",
DROP COLUMN "proxima_revision_tecnica",
DROP COLUMN "proximo_mantenimiento",
DROP COLUMN "ultima_revision_bomba_agua",
DROP COLUMN "ultimo_conductor",
DROP COLUMN "ultimo_inspector",
DROP COLUMN "ultimo_mantenimiento";

-- AlterTable
ALTER TABLE "carros" DROP COLUMN "anio_fabricacion",
DROP COLUMN "capacidad_tanque_combustible",
DROP COLUMN "combustible",
DROP COLUMN "conductor_asignado",
DROP COLUMN "descripcion_ultimo_mantenimiento",
DROP COLUMN "fecha_ultima_inspeccion",
DROP COLUMN "firma_ultimo_inspector",
DROP COLUMN "imagen_url",
DROP COLUMN "marca",
DROP COLUMN "motor",
DROP COLUMN "nombre",
DROP COLUMN "presion_bomba",
DROP COLUMN "proxima_revision_tecnica",
DROP COLUMN "proximo_mantenimiento",
DROP COLUMN "tipo",
DROP COLUMN "transmision",
DROP COLUMN "ultima_revision_bomba_agua",
DROP COLUMN "ultimo_conductor",
DROP COLUMN "ultimo_inspector",
DROP COLUMN "ultimo_mantenimiento";

-- AlterTable
ALTER TABLE "checklists_carro" DROP COLUMN "detalle",
DROP COLUMN "firma_inspector",
DROP COLUMN "firma_oficial",
DROP COLUMN "grupo_guardia",
DROP COLUMN "inspector",
DROP COLUMN "items_ok",
DROP COLUMN "observaciones",
DROP COLUMN "tipo",
DROP COLUMN "total_items";

-- AlterTable
ALTER TABLE "configuracion_sistema" DROP COLUMN "updated_at",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "licencias_medicas" DROP COLUMN "archivo_url",
DROP COLUMN "created_at",
DROP COLUMN "observacion_resolucion",
DROP COLUMN "resuelto_en",
DROP COLUMN "updated_at";

-- AlterTable
ALTER TABLE "pacientes_emergencia" DROP COLUMN "edad",
DROP COLUMN "rut";

-- AlterTable
ALTER TABLE "partes_emergencia" DROP COLUMN "clave_emergencia",
ADD COLUMN     "clave_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "password_reset_tokens" DROP COLUMN "created_at",
DROP COLUMN "used_at";

-- AlterTable
ALTER TABLE "unidades_en_emergencia" DROP COLUMN "hora6_3",
DROP COLUMN "hora6_9";

-- AlterTable
ALTER TABLE "usuarios" DROP COLUMN "actividad",
DROP COLUMN "clave_nomina",
DROP COLUMN "compania",
DROP COLUMN "comuna",
DROP COLUMN "created_at",
DROP COLUMN "cuerpo_bombero",
DROP COLUMN "direccion",
DROP COLUMN "fecha_ingreso",
DROP COLUMN "fecha_nacimiento",
DROP COLUMN "firma_imagen",
DROP COLUMN "nacionalidad",
DROP COLUMN "observaciones_registro",
DROP COLUMN "region",
DROP COLUMN "rol",
DROP COLUMN "tipo_voluntario",
DROP COLUMN "updated_at",
ADD COLUMN     "rol_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "catalogo_claves_emergencia" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "catalogo_claves_emergencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_claves_emergencia_codigo_key" ON "catalogo_claves_emergencia"("codigo");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles_usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partes_emergencia" ADD CONSTRAINT "partes_emergencia_clave_id_fkey" FOREIGN KEY ("clave_id") REFERENCES "catalogo_claves_emergencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
