/**
 * Lista canónica del formulario Excel «Check List Bolsos de Trauma R-1 (1–5)».
 * Mismos mínimos/óptimos por compartimiento para todas las nomenclaturas.
 */
export type MaterialDef = {
  nombre: string;
  cantidadMinima: number;
  cantidadOptima: number;
};

export type UbicacionDef = { nombre: string; materiales: MaterialDef[] };

const UBI_TRAUMA: UbicacionDef[] = [
  {
    nombre: 'Bolsillo Principal',
    materiales: [
      { nombre: 'Kit de cánulas', cantidadMinima: 1, cantidadOptima: 2 },
      { nombre: 'Estuche con guantes de nitrilo', cantidadMinima: 1, cantidadOptima: 2 },
      { nombre: 'Estuche con mascarillas', cantidadMinima: 1, cantidadOptima: 1 },
      { nombre: 'Vendaje israelí 4"', cantidadMinima: 1, cantidadOptima: 2 },
      { nombre: 'Torniquete', cantidadMinima: 1, cantidadOptima: 1 },
      { nombre: 'Suero 250 ml', cantidadMinima: 2, cantidadOptima: 5 },
      { nombre: 'Linterna pupilar', cantidadMinima: 1, cantidadOptima: 1 },
      { nombre: 'Bajada de suero', cantidadMinima: 1, cantidadOptima: 1 },
      { nombre: 'Tela adhesiva', cantidadMinima: 1, cantidadOptima: 3 },
      { nombre: 'Tarjetas signos vitales', cantidadMinima: 1, cantidadOptima: 1 },
      { nombre: 'Cortador de anillos', cantidadMinima: 1, cantidadOptima: 1 },
      { nombre: 'Tijera punta pato de rescate', cantidadMinima: 1, cantidadOptima: 1 },
      { nombre: 'Saturómetro', cantidadMinima: 1, cantidadOptima: 1 },
      { nombre: 'Plumón permanente Sharpie', cantidadMinima: 1, cantidadOptima: 1 },
      { nombre: 'Apósitos 10 x 10', cantidadMinima: 5, cantidadOptima: 10 },
      { nombre: 'Apósitos 10 x 20', cantidadMinima: 5, cantidadOptima: 10 },
      { nombre: 'Apósitos 13 x 24', cantidadMinima: 5, cantidadOptima: 10 },
      { nombre: 'Apósitos 20 x 25', cantidadMinima: 5, cantidadOptima: 10 },
      { nombre: 'Vendaje triangular', cantidadMinima: 1, cantidadOptima: 3 },
      { nombre: 'Elastomull 8 cm', cantidadMinima: 4, cantidadOptima: 10 },
      { nombre: 'Elastomull 6 cm', cantidadMinima: 4, cantidadOptima: 10 },
      { nombre: 'Elastomull 4 cm', cantidadMinima: 4, cantidadOptima: 10 },
      { nombre: 'Mantas térmicas', cantidadMinima: 2, cantidadOptima: 5 },
      { nombre: 'Suero 20 ml', cantidadMinima: 5, cantidadOptima: 10 },
    ],
  },
  {
    nombre: 'Bolsillo Delantero',
    materiales: [
      { nombre: 'Collar cervical adulto', cantidadMinima: 3, cantidadOptima: 4 },
      { nombre: 'Collar cervical pediátrico', cantidadMinima: 1, cantidadOptima: 2 },
    ],
  },
  {
    nombre: 'Bolsillo Superior',
    materiales: [{ nombre: 'Aspirador manual', cantidadMinima: 1, cantidadOptima: 1 }],
  },
  {
    nombre: 'Bolsillo Posterior',
    materiales: [
      { nombre: 'Bolsa de resucitación manual adulto', cantidadMinima: 1, cantidadOptima: 1 },
      { nombre: 'Bolsa de resucitación manual pediátrica', cantidadMinima: 1, cantidadOptima: 1 },
      { nombre: 'Mascarilla oxígeno con reservorio adulto', cantidadMinima: 1, cantidadOptima: 2 },
      { nombre: 'Mascarilla oxígeno con reservorio pediátrica', cantidadMinima: 1, cantidadOptima: 2 },
    ],
  },
  {
    nombre: 'Bolsillo Derecho',
    materiales: [
      { nombre: 'Máscara unidireccional', cantidadMinima: 1, cantidadOptima: 1 },
      { nombre: 'Bolsas para residuos', cantidadMinima: 1, cantidadOptima: 1 },
    ],
  },
  {
    nombre: 'Bolsillo Izquierdo',
    materiales: [{ nombre: 'Esfigmomanómetro', cantidadMinima: 1, cantidadOptima: 1 }],
  },
];

export function ubicacionesPlantillaTraumaOficial(): UbicacionDef[] {
  return UBI_TRAUMA.map((u) => ({
    nombre: u.nombre,
    materiales: u.materiales.map((m) => ({ ...m })),
  }));
}
