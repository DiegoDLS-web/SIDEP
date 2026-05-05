-- CreateTable
CREATE TABLE "ActividadUsuario" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER,
    "accion" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "referencia" TEXT,
    "detalle" JSONB,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActividadUsuario_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ActividadUsuario"
ADD CONSTRAINT "ActividadUsuario_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
