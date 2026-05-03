-- AlterTable
ALTER TABLE "Usuario"
ADD COLUMN "email" TEXT,
ADD COLUMN "telefono" TEXT,
ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ConfiguracionSistema" (
    "id" SERIAL NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionSistema_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionSistema_clave_key" ON "ConfiguracionSistema"("clave");
