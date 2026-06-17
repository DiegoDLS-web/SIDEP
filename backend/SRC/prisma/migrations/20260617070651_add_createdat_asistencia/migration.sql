-- AlterTable
ALTER TABLE "asistencia_personal" ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
