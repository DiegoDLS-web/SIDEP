/**
 * Texto alineado con el menú lateral y guards del frontend (`app.routes.ts`, `MainLayoutComponent.sections`).
 * El backend puede restringir acciones por endpoint más allá de lo que muestra SIDEP aquí.
 */
export function textoAccesoVistaSidebar(rolRaw: string | undefined): { lineas: string[]; nota: string } {
  const r = rolRaw?.trim().toUpperCase().replace(/\s+/g, '_') ?? '';

  const baseOperativo =
    'Estadísticas, Partes (historial y nuevo parte), Carros, Checklist por unidad, Checklist ERA, Bolso de trauma, Licencias y Analítica operacional desde el menú lateral.';

  if (r === 'ADMIN') {
    return {
      lineas: [
        baseOperativo,
        'Además: gestión de Usuarios y Configuraciones del sistema.',
        'En Configuraciones puedes definir el menú lateral que verá cada rol (además del predeterminado).',
      ],
      nota: 'Las acciones que valide la API en cada endpoint siguen teniendo prioridad sobre la vista de navegación.',
    };
  }

  if (r === 'CAPITAN' || r === 'TENIENTE') {
    return {
      lineas: [
        baseOperativo,
        'Además: sección Usuarios en el menú (sin acceso a Configuraciones desde el frontend).',
      ],
      nota: 'Las operaciones sensibles pueden estar limitadas también en backend.',
    };
  }

  return {
    lineas: [
      'Con tu rol tienes visibilidad sobre operación día a día:',
      baseOperativo,
      'Las entradas de Sistema (Usuarios / Configuraciones) no aparecen en el menú lateral por defecto.',
      'Los administradores pueden afinar las rutas visibles por rol desde Configuraciones → Menú lateral por rol.',
    ],
    nota: 'El servidor puede restringir además algunas pantallas por permisos; la lista exacta aparece también en tu perfil (Accesos de tu cuenta).',
  };
}
