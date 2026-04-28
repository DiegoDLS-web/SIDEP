/**
 * Fábricas de carga perezosa (lazy loading).
 * Cada `import()` genera un chunk aparte: menos JS en la primera pantalla.
 */

export const loadLoginComponent = () =>
  import('../pages/login/login.component').then((m) => m.LoginComponent);

export const loadPasswordForgotComponent = () =>
  import('../pages/auth/password-forgot.component').then((m) => m.PasswordForgotComponent);

export const loadPasswordResetComponent = () =>
  import('../pages/auth/password-reset.component').then((m) => m.PasswordResetComponent);

export const loadMainLayoutComponent = () =>
  import('../layout/main-layout.component').then((m) => m.MainLayoutComponent);

export const loadDashboardComponent = () =>
  import('../pages/dashboard/dashboard.component').then((m) => m.DashboardComponent);

export const loadParteNuevoComponent = () =>
  import('../pages/partes/parte-nuevo.component').then((m) => m.ParteNuevoComponent);

export const loadParteDetalleComponent = () =>
  import('../pages/partes/parte-detalle.component').then((m) => m.ParteDetalleComponent);

export const loadPartesListaComponent = () =>
  import('../pages/partes/partes-lista.component').then((m) => m.PartesListaComponent);

export const loadCarrosPageComponent = () =>
  import('../pages/carros/carros-page.component').then((m) => m.CarrosPageComponent);

export const loadChecklistEraComponent = () =>
  import('../pages/checklist/checklist-era.component').then((m) => m.ChecklistEraComponent);

export const loadChecklistUnidadComponent = () =>
  import('../pages/checklist/checklist-unidad.component').then((m) => m.ChecklistUnidadComponent);

export const loadChecklistSelectorComponent = () =>
  import('../pages/checklist/checklist-selector.component').then((m) => m.ChecklistSelectorComponent);

export const loadBolsoTraumaShellComponent = () =>
  import('../pages/bolso-trauma/bolso-trauma-shell.component').then((m) => m.BolsoTraumaShellComponent);

export const loadBolsoTraumaComponent = () =>
  import('../pages/bolso-trauma/bolso-trauma.component').then((m) => m.BolsoTraumaComponent);

export const loadBolsoTraumaRegistroComponent = () =>
  import('../pages/bolso-trauma/bolso-trauma-registro.component').then(
    (m) => m.BolsoTraumaRegistroComponent,
  );

export const loadUsuariosComponent = () =>
  import('../pages/usuarios/usuarios.component').then((m) => m.UsuariosComponent);

export const loadConfiguracionesComponent = () =>
  import('../pages/configuraciones/configuraciones.component').then((m) => m.ConfiguracionesComponent);

export const loadCambiarPasswordInicialComponent = () =>
  import('../pages/auth/cambiar-password-inicial.component').then((m) => m.CambiarPasswordInicialComponent);

export const loadLicenciasPageComponent = () =>
  import('../pages/licencias/licencias-page.component').then((m) => m.LicenciasPageComponent);

export const loadAnaliticaPageComponent = () =>
  import('../pages/analitica/analitica-page.component').then((m) => m.AnaliticaPageComponent);

/** Pantallas “próximamente” reutilizables. */
export function rutaPlaceholder(title: string) {
  return {
    loadComponent: () =>
      import('../pages/placeholder/feature-placeholder.component').then((m) => m.FeaturePlaceholderComponent),
    data: { title },
  };
}
