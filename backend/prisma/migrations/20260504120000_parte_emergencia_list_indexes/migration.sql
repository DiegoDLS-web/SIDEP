-- Listados de partes: orderBy fecha DESC + filtros por clave y rango de fechas.
CREATE INDEX "ParteEmergencia_fecha_idx" ON "ParteEmergencia" ("fecha" DESC);
CREATE INDEX "ParteEmergencia_claveEmergencia_fecha_idx" ON "ParteEmergencia" ("claveEmergencia", "fecha" DESC);
