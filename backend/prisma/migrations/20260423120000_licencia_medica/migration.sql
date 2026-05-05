-- CreateTable
CREATE TABLE "LicenciaMedica" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaTermino" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT NOT NULL,
    "archivoUrl" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "observacionResolucion" TEXT,
    "resueltoPorId" INTEGER,
    "resueltoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LicenciaMedica_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LicenciaMedica_usuarioId_fechaInicio_fechaTermino_idx" ON "LicenciaMedica"("usuarioId", "fechaInicio", "fechaTermino");

-- CreateIndex
CREATE INDEX "LicenciaMedica_estado_fechaInicio_fechaTermino_idx" ON "LicenciaMedica"("estado", "fechaInicio", "fechaTermino");

-- AddForeignKey
ALTER TABLE "LicenciaMedica" ADD CONSTRAINT "LicenciaMedica_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenciaMedica" ADD CONSTRAINT "LicenciaMedica_resueltoPorId_fkey" FOREIGN KEY ("resueltoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
