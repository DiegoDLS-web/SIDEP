-- AlterTable
ALTER TABLE "ChecklistCarro"
ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'UNIDAD',
ADD COLUMN "inspector" TEXT,
ADD COLUMN "grupoGuardia" TEXT,
ADD COLUMN "firmaOficial" TEXT,
ADD COLUMN "observaciones" TEXT,
ADD COLUMN "totalItems" INTEGER,
ADD COLUMN "itemsOk" INTEGER,
ADD COLUMN "detalle" JSONB;
