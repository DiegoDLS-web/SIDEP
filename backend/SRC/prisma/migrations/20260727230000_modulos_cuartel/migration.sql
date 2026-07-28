-- Módulos cuartel: guardias, libro de novedades, asistencia cuarteleros

CREATE TABLE "guardia_turno" (
    "id" VARCHAR(36) NOT NULL,
    "fecha" DATE NOT NULL,
    "grupo" VARCHAR(10) NOT NULL,
    "tipo_turno" VARCHAR(20) NOT NULL DEFAULT '24H',
    "cuartelero_rut" VARCHAR(20),
    "obac_rut" VARCHAR(20),
    "observaciones" TEXT,
    "registrado_por_rut" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guardia_turno_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "guardia_miembro" (
    "id" VARCHAR(36) NOT NULL,
    "guardia_id" VARCHAR(36) NOT NULL,
    "usuario_rut" VARCHAR(20) NOT NULL,
    "rol_en_guardia" VARCHAR(50),

    CONSTRAINT "guardia_miembro_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "libro_novedad" (
    "id" VARCHAR(36) NOT NULL,
    "fecha_hora" TIMESTAMPTZ(6) NOT NULL,
    "categoria" VARCHAR(50) NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "grupo_guardia" VARCHAR(10),
    "importante" SMALLINT NOT NULL DEFAULT 0,
    "autor_rut" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "libro_novedad_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "asistencia_cuartelero" (
    "id" VARCHAR(36) NOT NULL,
    "fecha" DATE NOT NULL,
    "usuario_rut" VARCHAR(20) NOT NULL,
    "grupo_guardia" VARCHAR(10),
    "presente" SMALLINT NOT NULL DEFAULT 1,
    "hora_entrada" VARCHAR(5),
    "hora_salida" VARCHAR(5),
    "observaciones" TEXT,
    "registrado_por_rut" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asistencia_cuartelero_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "guardia_turno_fecha_grupo_key" ON "guardia_turno"("fecha", "grupo");
CREATE INDEX "guardia_turno_fecha_idx" ON "guardia_turno"("fecha");

CREATE UNIQUE INDEX "guardia_miembro_guardia_id_usuario_rut_key" ON "guardia_miembro"("guardia_id", "usuario_rut");

CREATE INDEX "libro_novedad_fecha_hora_idx" ON "libro_novedad"("fecha_hora" DESC);
CREATE INDEX "libro_novedad_categoria_idx" ON "libro_novedad"("categoria");

CREATE UNIQUE INDEX "asistencia_cuartelero_fecha_usuario_rut_key" ON "asistencia_cuartelero"("fecha", "usuario_rut");
CREATE INDEX "asistencia_cuartelero_fecha_idx" ON "asistencia_cuartelero"("fecha");

ALTER TABLE "guardia_turno" ADD CONSTRAINT "guardia_turno_cuartelero_rut_fkey" FOREIGN KEY ("cuartelero_rut") REFERENCES "usuario"("rut") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "guardia_turno" ADD CONSTRAINT "guardia_turno_obac_rut_fkey" FOREIGN KEY ("obac_rut") REFERENCES "usuario"("rut") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "guardia_turno" ADD CONSTRAINT "guardia_turno_registrado_por_rut_fkey" FOREIGN KEY ("registrado_por_rut") REFERENCES "usuario"("rut") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "guardia_miembro" ADD CONSTRAINT "guardia_miembro_guardia_id_fkey" FOREIGN KEY ("guardia_id") REFERENCES "guardia_turno"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guardia_miembro" ADD CONSTRAINT "guardia_miembro_usuario_rut_fkey" FOREIGN KEY ("usuario_rut") REFERENCES "usuario"("rut") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "libro_novedad" ADD CONSTRAINT "libro_novedad_autor_rut_fkey" FOREIGN KEY ("autor_rut") REFERENCES "usuario"("rut") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "asistencia_cuartelero" ADD CONSTRAINT "asistencia_cuartelero_usuario_rut_fkey" FOREIGN KEY ("usuario_rut") REFERENCES "usuario"("rut") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asistencia_cuartelero" ADD CONSTRAINT "asistencia_cuartelero_registrado_por_rut_fkey" FOREIGN KEY ("registrado_por_rut") REFERENCES "usuario"("rut") ON DELETE RESTRICT ON UPDATE CASCADE;
