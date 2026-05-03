-- AlterTable: campos extendidos de ficha / mantención
ALTER TABLE "Carro" ADD COLUMN "descripcionUltimoMantenimiento" TEXT;
ALTER TABLE "Carro" ADD COLUMN "proximaRevisionTecnica" TIMESTAMP(3);
ALTER TABLE "Carro" ADD COLUMN "ultimaRevisionBombaAgua" TIMESTAMP(3);
ALTER TABLE "Carro" ADD COLUMN "ultimoInspector" TEXT;
ALTER TABLE "Carro" ADD COLUMN "firmaUltimoInspector" TEXT;
ALTER TABLE "Carro" ADD COLUMN "fechaUltimaInspeccion" TIMESTAMP(3);
ALTER TABLE "Carro" ADD COLUMN "ultimoConductor" TEXT;

-- CreateTable
CREATE TABLE "CarroRegistroHistorial" (
    "id" SERIAL NOT NULL,
    "carroId" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoMantenimiento" TIMESTAMP(3),
    "proximoMantenimiento" TIMESTAMP(3),
    "proximaRevisionTecnica" TIMESTAMP(3),
    "ultimaRevisionBombaAgua" TIMESTAMP(3),
    "descripcionUltimoMantenimiento" TEXT,
    "ultimoInspector" TEXT,
    "firmaUltimoInspector" TEXT,
    "fechaUltimaInspeccion" TIMESTAMP(3),
    "ultimoConductor" TEXT,

    CONSTRAINT "CarroRegistroHistorial_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CarroRegistroHistorial_carroId_idx" ON "CarroRegistroHistorial"("carroId");

ALTER TABLE "CarroRegistroHistorial" ADD CONSTRAINT "CarroRegistroHistorial_carroId_fkey" FOREIGN KEY ("carroId") REFERENCES "Carro"("id") ON DELETE CASCADE ON UPDATE CASCADE;
