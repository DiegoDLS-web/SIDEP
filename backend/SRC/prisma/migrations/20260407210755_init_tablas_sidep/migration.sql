-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "rut" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParteEmergencia" (
    "id" SERIAL NOT NULL,
    "correlativo" TEXT NOT NULL,
    "claveEmergencia" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "obacId" INTEGER NOT NULL,

    CONSTRAINT "ParteEmergencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadEnEmergencia" (
    "id" SERIAL NOT NULL,
    "parteId" INTEGER NOT NULL,
    "carroId" INTEGER NOT NULL,
    "horaSalida" TEXT NOT NULL,
    "horaLlegada" TEXT NOT NULL,
    "kmSalida" INTEGER NOT NULL,
    "kmLlegada" INTEGER NOT NULL,

    CONSTRAINT "UnidadEnEmergencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PacienteEmergencia" (
    "id" SERIAL NOT NULL,
    "parteId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "triage" TEXT NOT NULL,

    CONSTRAINT "PacienteEmergencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Carro" (
    "id" SERIAL NOT NULL,
    "nomenclatura" TEXT NOT NULL,
    "patente" TEXT NOT NULL,
    "estadoOperativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Carro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistCarro" (
    "id" SERIAL NOT NULL,
    "carroId" INTEGER NOT NULL,
    "cuarteleroId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistCarro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_rut_key" ON "Usuario"("rut");

-- CreateIndex
CREATE UNIQUE INDEX "ParteEmergencia_correlativo_key" ON "ParteEmergencia"("correlativo");

-- CreateIndex
CREATE UNIQUE INDEX "Carro_nomenclatura_key" ON "Carro"("nomenclatura");

-- CreateIndex
CREATE UNIQUE INDEX "Carro_patente_key" ON "Carro"("patente");

-- AddForeignKey
ALTER TABLE "ParteEmergencia" ADD CONSTRAINT "ParteEmergencia_obacId_fkey" FOREIGN KEY ("obacId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadEnEmergencia" ADD CONSTRAINT "UnidadEnEmergencia_parteId_fkey" FOREIGN KEY ("parteId") REFERENCES "ParteEmergencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadEnEmergencia" ADD CONSTRAINT "UnidadEnEmergencia_carroId_fkey" FOREIGN KEY ("carroId") REFERENCES "Carro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacienteEmergencia" ADD CONSTRAINT "PacienteEmergencia_parteId_fkey" FOREIGN KEY ("parteId") REFERENCES "ParteEmergencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistCarro" ADD CONSTRAINT "ChecklistCarro_carroId_fkey" FOREIGN KEY ("carroId") REFERENCES "Carro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistCarro" ADD CONSTRAINT "ChecklistCarro_cuarteleroId_fkey" FOREIGN KEY ("cuarteleroId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
