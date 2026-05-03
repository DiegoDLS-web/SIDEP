/** Rutas de marca SIDEP servidas desde `angular.json` → `projects/…/assets`. */

export const SIDEP_MARK_PNG = 'assets/branding/sidep-mark-only.png';
export const SIDEP_FULL_LOGO_PNG = 'assets/branding/sidep-logo-full-transparent.png';
export const SIDEP_WORDMARK_PNG = 'assets/branding/sidep-wordmark.png';

/** Path absoluto (fetch/jsPDF en runtime del navegador). */
export const SIDEP_MARK_PNG_ABSOLUTE = '/assets/branding/sidep-mark-only.png';

/** Logo compañía: primero subido en servidor (`POST /api/configuraciones/logo-compania`), luego asset por defecto. */
export const COMPANIA_LOGO_TRY_PATHS = [
  '/uploads/compania-logo.png',
  '/uploads/compania-logo.jpg',
  '/assets/logos/compania-logo.png',
] as const;
