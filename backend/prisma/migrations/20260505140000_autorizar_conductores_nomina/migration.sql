-- Conductores autorizados (listado operativo compañía).
UPDATE "Usuario"
SET "autorizadoConducir" = true
WHERE "nombre" IN (
  'Bernardo Valenzuela Palma',
  'Nicolás Ponce Ramírez',
  'Felipe López Flores',
  'Francisco López Flores',
  'Freddy Pezo Mardones',
  'Juan José Salazar Erices',
  'Sergio Ariel Contreras Gutierrez',
  'Luis Molina Castro',
  'Hector González Duran',
  'Jonathan Mora Bustamante'
);

-- Eliecer Arriaga Neira (posibles variantes de escritura).
UPDATE "Usuario"
SET "autorizadoConducir" = true
WHERE "nombre" ILIKE '%eliecer%arriaga%'
   OR "nombre" ILIKE '%eliecer%arriagada%';
