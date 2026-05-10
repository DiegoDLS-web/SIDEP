-- Eliecer Arriaga/Arriagada Neira: categoría cuartelero (no voluntario genérico).
-- El seed anterior forzaba `tipoVoluntario = VOLUNTARIO` también sobre CUARTELERO.
UPDATE "Usuario"
SET "tipoVoluntario" = 'CUARTELERO'
WHERE (
  "nombre" ILIKE '%eliecer%arriaga%'
  OR "nombre" ILIKE '%eliecer%arriagada%'
);
