/*
  Warnings:

  - You are about to drop the column `firma_imagen` on the `usuario` table. All the data in the column will be lost.
  - You are about to drop the column `foto_perfil` on the `usuario` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "licencia_medica" ADD COLUMN     "archivo_public_id" VARCHAR(255);

-- AlterTable
ALTER TABLE "usuario" DROP COLUMN "firma_imagen",
DROP COLUMN "foto_perfil",
ADD COLUMN     "firma_imagen_public_id" TEXT,
ADD COLUMN     "firma_imagen_url" TEXT,
ADD COLUMN     "foto_perfil_public_id" TEXT,
ADD COLUMN     "foto_perfil_url" TEXT;
