import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { gestionUsuariosGuard } from './guards/gestion-usuarios.guard';
import { guestGuard } from './guards/guest.guard';
import {
  loadBolsoTraumaComponent,
  loadBolsoTraumaRegistroComponent,
  loadBolsoTraumaShellComponent,
  loadAnaliticaPageComponent,
  loadCambiarPasswordInicialComponent,
  loadCarrosPageComponent,
  loadChecklistEraComponent,
  loadChecklistSelectorComponent,
  loadChecklistUnidadComponent,
  loadConfiguracionesComponent,
  loadDashboardComponent,
  loadLoginComponent,
  loadMainLayoutComponent,
  loadLicenciasPageComponent,
  loadParteDetalleComponent,
  loadParteNuevoComponent,
  loadPartesListaComponent,
  loadPasswordForgotComponent,
  loadPasswordResetComponent,
  loadUsuariosComponent,
  rutaPlaceholder,
} from './routing/lazy-routes';

/**
 * Rutas de la aplicación: todas las pantallas con contenido usan loadComponent (lazy).
 */
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: loadLoginComponent,
  },
  {
    path: 'recuperar-password',
    canActivate: [guestGuard],
    loadComponent: loadPasswordForgotComponent,
  },
  {
    path: 'restablecer-password/:token',
    canActivate: [guestGuard],
    loadComponent: loadPasswordResetComponent,
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: loadMainLayoutComponent,
    children: [
      { path: '', loadComponent: loadDashboardComponent },
      {
        path: 'partes/nuevo',
        loadComponent: loadParteNuevoComponent,
      },
      {
        path: 'partes/:id',
        loadComponent: loadParteDetalleComponent,
      },
      {
        path: 'partes',
        loadComponent: loadPartesListaComponent,
      },
      {
        path: 'carros/:id',
        loadComponent: loadCarrosPageComponent,
      },
      {
        path: 'carros',
        loadComponent: loadCarrosPageComponent,
      },
      { path: 'inventarios/bodega', ...rutaPlaceholder('Inventarios — Bodega') },
      { path: 'inventarios', ...rutaPlaceholder('Inventarios') },
      {
        path: 'checklist-era',
        loadComponent: loadChecklistEraComponent,
      },
      {
        path: 'checklist/:unidad',
        loadComponent: loadChecklistUnidadComponent,
      },
      {
        path: 'checklist',
        loadComponent: loadChecklistSelectorComponent,
      },
      {
        path: 'bolso-trauma',
        loadComponent: loadBolsoTraumaShellComponent,
        children: [
          {
            path: '',
            loadComponent: loadBolsoTraumaComponent,
          },
          {
            path: ':unidad',
            loadComponent: loadBolsoTraumaRegistroComponent,
          },
        ],
      },
      {
        path: 'usuarios',
        canActivate: [gestionUsuariosGuard],
        loadComponent: loadUsuariosComponent,
      },
      {
        path: 'configuraciones',
        canActivate: [adminGuard],
        loadComponent: loadConfiguracionesComponent,
      },
      {
        path: 'cambiar-password-inicial',
        loadComponent: loadCambiarPasswordInicialComponent,
      },
      {
        path: 'licencias',
        loadComponent: loadLicenciasPageComponent,
      },
      {
        path: 'licencias-medicas',
        loadComponent: loadLicenciasPageComponent,
      },
      {
        path: 'analitica-operacional',
        loadComponent: loadAnaliticaPageComponent,
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
