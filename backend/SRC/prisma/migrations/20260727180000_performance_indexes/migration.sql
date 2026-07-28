-- Índices de rendimiento para listados frecuentes
CREATE INDEX IF NOT EXISTS "parte_emergencia_fecha_emergencia_idx" ON "parte_emergencia"("fecha_emergencia");
CREATE INDEX IF NOT EXISTS "parte_emergencia_estado_id_idx" ON "parte_emergencia"("estado_id");
CREATE INDEX IF NOT EXISTS "parte_emergencia_clave_id_idx" ON "parte_emergencia"("clave_id");
CREATE INDEX IF NOT EXISTS "parte_emergencia_obac_rut_idx" ON "parte_emergencia"("obac_rut");

CREATE INDEX IF NOT EXISTS "asistencia_personal_parte_id_idx" ON "asistencia_personal"("parte_id");
CREATE INDEX IF NOT EXISTS "asistencia_personal_usuario_rut_idx" ON "asistencia_personal"("usuario_rut");

CREATE INDEX IF NOT EXISTS "unidad_en_emergencia_parte_id_idx" ON "unidad_en_emergencia"("parte_id");
CREATE INDEX IF NOT EXISTS "unidad_en_emergencia_carro_id_idx" ON "unidad_en_emergencia"("carro_id");

CREATE INDEX IF NOT EXISTS "checklist_ejecucion_entidad_idx" ON "checklist_ejecucion"("entidad_id", "entidad_tipo");
CREATE INDEX IF NOT EXISTS "checklist_ejecucion_fecha_revision_idx" ON "checklist_ejecucion"("fecha_revision");

CREATE INDEX IF NOT EXISTS "licencia_medica_usuario_rut_idx" ON "licencia_medica"("usuario_rut");
CREATE INDEX IF NOT EXISTS "licencia_medica_fechas_idx" ON "licencia_medica"("fecha_inicio", "fecha_termino");
CREATE INDEX IF NOT EXISTS "licencia_medica_estado_licencia_id_idx" ON "licencia_medica"("estado_licencia_id");
