/*
  Warnings:

  - You are about to drop the `Carro` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChecklistCarro` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PacienteEmergencia` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ParteEmergencia` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UnidadEnEmergencia` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Usuario` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ChecklistCarro" DROP CONSTRAINT "ChecklistCarro_carroId_fkey";

-- DropForeignKey
ALTER TABLE "ChecklistCarro" DROP CONSTRAINT "ChecklistCarro_cuarteleroId_fkey";

-- DropForeignKey
ALTER TABLE "PacienteEmergencia" DROP CONSTRAINT "PacienteEmergencia_parteId_fkey";

-- DropForeignKey
ALTER TABLE "ParteEmergencia" DROP CONSTRAINT "ParteEmergencia_obacId_fkey";

-- DropForeignKey
ALTER TABLE "UnidadEnEmergencia" DROP CONSTRAINT "UnidadEnEmergencia_carroId_fkey";

-- DropForeignKey
ALTER TABLE "UnidadEnEmergencia" DROP CONSTRAINT "UnidadEnEmergencia_parteId_fkey";

-- DropTable
DROP TABLE "Carro";

-- DropTable
DROP TABLE "ChecklistCarro";

-- DropTable
DROP TABLE "PacienteEmergencia";

-- DropTable
DROP TABLE "ParteEmergencia";

-- DropTable
DROP TABLE "UnidadEnEmergencia";

-- DropTable
DROP TABLE "Usuario";

-- CreateTable
CREATE TABLE "actividades_usuario" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "accion" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "referencia" TEXT,
    "detalle" JSONB,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actividades_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carros" (
    "id" SERIAL NOT NULL,
    "nomenclatura" TEXT NOT NULL,
    "patente" TEXT NOT NULL,
    "estado_operativo" BOOLEAN NOT NULL DEFAULT true,
    "nombre" TEXT,
    "tipo" TEXT,
    "marca" TEXT,
    "anio_fabricacion" INTEGER,
    "capacidad_agua" TEXT,
    "imagen_url" TEXT,
    "kilometraje" INTEGER,
    "ultimo_mantenimiento" TIMESTAMP(3),
    "proximo_mantenimiento" TIMESTAMP(3),
    "conductor_asignado" TEXT,
    "motor" TEXT,
    "transmision" TEXT,
    "combustible" TEXT,
    "presion_bomba" TEXT,
    "capacidad_tanque_combustible" TEXT,
    "descripcion_ultimo_mantenimiento" TEXT,
    "proxima_revision_tecnica" TIMESTAMP(3),
    "ultima_revision_bomba_agua" TIMESTAMP(3),
    "ultimo_inspector" TEXT,
    "firma_ultimo_inspector" TEXT,
    "fecha_ultima_inspeccion" TIMESTAMP(3),
    "ultimo_conductor" TEXT,

    CONSTRAINT "carros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carro_registro_historial" (
    "id" SERIAL NOT NULL,
    "carro_id" INTEGER NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo_mantenimiento" TIMESTAMP(3),
    "proximo_mantenimiento" TIMESTAMP(3),
    "proxima_revision_tecnica" TIMESTAMP(3),
    "ultima_revision_bomba_agua" TIMESTAMP(3),
    "descripcion_ultimo_mantenimiento" TEXT,
    "ultimo_inspector" TEXT,
    "firma_ultimo_inspector" TEXT,
    "fecha_ultima_inspeccion" TIMESTAMP(3),
    "ultimo_conductor" TEXT,

    CONSTRAINT "carro_registro_historial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklists_carro" (
    "id" SERIAL NOT NULL,
    "carro_id" INTEGER NOT NULL,
    "cuartelero_id" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL DEFAULT 'UNIDAD',
    "inspector" TEXT,
    "grupo_guardia" TEXT,
    "firma_oficial" TEXT,
    "observaciones" TEXT,
    "total_items" INTEGER,
    "items_ok" INTEGER,
    "detalle" JSONB,
    "firma_inspector" TEXT,

    CONSTRAINT "checklists_carro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion_sistema" (
    "id" SERIAL NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_sistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licencias_medicas" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_termino" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT NOT NULL,
    "archivo_url" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "observacion_resolucion" TEXT,
    "resuelto_por_id" INTEGER,
    "resuelto_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licencias_medicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pacientes_emergencia" (
    "id" SERIAL NOT NULL,
    "parte_id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "triage" TEXT NOT NULL,
    "edad" INTEGER,
    "rut" TEXT,

    CONSTRAINT "pacientes_emergencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partes_emergencia" (
    "id" SERIAL NOT NULL,
    "correlativo" TEXT NOT NULL,
    "clave_emergencia" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "obac_id" INTEGER NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "partes_emergencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles_usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades_en_emergencia" (
    "id" SERIAL NOT NULL,
    "parte_id" INTEGER NOT NULL,
    "carro_id" INTEGER NOT NULL,
    "hora_salida" TEXT NOT NULL,
    "hora_llegada" TEXT NOT NULL,
    "km_salida" INTEGER NOT NULL,
    "km_llegada" INTEGER NOT NULL,
    "hora6_0" TEXT NOT NULL DEFAULT '00:00',
    "hora6_3" TEXT NOT NULL DEFAULT '00:00',
    "hora6_9" TEXT NOT NULL DEFAULT '00:00',
    "hora6_10" TEXT NOT NULL DEFAULT '00:00',

    CONSTRAINT "unidades_en_emergencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "rut" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "nombres" TEXT,
    "apellido_paterno" TEXT,
    "apellido_materno" TEXT,
    "nacionalidad" TEXT,
    "grupo_sanguineo" TEXT,
    "direccion" TEXT,
    "region" TEXT,
    "comuna" TEXT,
    "actividad" TEXT,
    "fecha_nacimiento" TIMESTAMP(3),
    "fecha_ingreso" TIMESTAMP(3),
    "tipo_voluntario" TEXT,
    "cuerpo_bombero" TEXT,
    "compania" TEXT,
    "estado_voluntario" TEXT DEFAULT 'VIGENTE',
    "cargo_oficialidad" TEXT,
    "observaciones_registro" TEXT,
    "firma_imagen" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "requiere_cambio_password" BOOLEAN NOT NULL DEFAULT false,
    "foto_perfil" TEXT,
    "autorizado_conducir" BOOLEAN NOT NULL DEFAULT false,
    "clave_nomina" TEXT,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "carros_nomenclatura_key" ON "carros"("nomenclatura");

-- CreateIndex
CREATE UNIQUE INDEX "carros_patente_key" ON "carros"("patente");

-- CreateIndex
CREATE INDEX "carro_registro_historial_carro_id_idx" ON "carro_registro_historial"("carro_id");

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_sistema_clave_key" ON "configuracion_sistema"("clave");

-- CreateIndex
CREATE INDEX "licencias_medicas_estado_fecha_inicio_fecha_termino_idx" ON "licencias_medicas"("estado", "fecha_inicio", "fecha_termino");

-- CreateIndex
CREATE INDEX "licencias_medicas_usuario_id_fecha_inicio_fecha_termino_idx" ON "licencias_medicas"("usuario_id", "fecha_inicio", "fecha_termino");

-- CreateIndex
CREATE UNIQUE INDEX "partes_emergencia_correlativo_key" ON "partes_emergencia"("correlativo");

-- CreateIndex
CREATE INDEX "partes_emergencia_clave_emergencia_fecha_idx" ON "partes_emergencia"("clave_emergencia", "fecha" DESC);

-- CreateIndex
CREATE INDEX "partes_emergencia_fecha_idx" ON "partes_emergencia"("fecha" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "roles_usuario_nombre_key" ON "roles_usuario"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_rut_key" ON "usuarios"("rut");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_clave_nomina_key" ON "usuarios"("clave_nomina");

-- AddForeignKey
ALTER TABLE "actividades_usuario" ADD CONSTRAINT "actividades_usuario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carro_registro_historial" ADD CONSTRAINT "carro_registro_historial_carro_id_fkey" FOREIGN KEY ("carro_id") REFERENCES "carros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklists_carro" ADD CONSTRAINT "checklists_carro_carro_id_fkey" FOREIGN KEY ("carro_id") REFERENCES "carros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklists_carro" ADD CONSTRAINT "checklists_carro_cuartelero_id_fkey" FOREIGN KEY ("cuartelero_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licencias_medicas" ADD CONSTRAINT "licencias_medicas_resuelto_por_id_fkey" FOREIGN KEY ("resuelto_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licencias_medicas" ADD CONSTRAINT "licencias_medicas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pacientes_emergencia" ADD CONSTRAINT "pacientes_emergencia_parte_id_fkey" FOREIGN KEY ("parte_id") REFERENCES "partes_emergencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partes_emergencia" ADD CONSTRAINT "partes_emergencia_obac_id_fkey" FOREIGN KEY ("obac_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidades_en_emergencia" ADD CONSTRAINT "unidades_en_emergencia_carro_id_fkey" FOREIGN KEY ("carro_id") REFERENCES "carros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidades_en_emergencia" ADD CONSTRAINT "unidades_en_emergencia_parte_id_fkey" FOREIGN KEY ("parte_id") REFERENCES "partes_emergencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
