import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { gestionUsuariosGuard } from './guards/gestion-usuarios.guard';
import { catalogoEmergenciasGuard } from './guards/catalogo-emergencias.guard';
import { guestGuard } from './guards/guest.guard';
import { edicionPendienteGuard } from './guards/edicion-pendiente.guard';
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
  loadCatalogoTiposEmergenciaComponent,
  loadConfiguracionesComponent,
  loadDashboardComponent,
  loadLoginComponent,
  loadMainLayoutComponent,
  loadLicenciasPageComponent,
  loadMiPerfilComponent,
  loadParteDetalleComponent,
  loadParteNuevoComponent,
  loadPartesListaComponent,
  loadPasswordForgotComponent,
  loadPasswordResetComponent,
  loadUsuariosComponent,
  loadAuditoriaShellComponent,
  loadAuditoriaDashboardComponent,
  loadAuditoriaChecklistsComponent,
  loadAuditoriaUsuariosComponent,
  loadAuditoriaLogComponent,
  rutaPlaceholder,
} from './routing/lazy-routes';

/**
 * Rutas de la aplicación: todas las pantallas con contenido usan loadComponent (lazy).
 */
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Iniciar sesión · SIDEP',
    loadComponent: loadLoginComponent,
  },
  {
    path: 'recuperar-password',
    canActivate: [guestGuard],
    title: 'Recuperar contraseña · SIDEP',
    loadComponent: loadPasswordForgotComponent,
  },
  {
    path: 'restablecer-password/:token',
    canActivate: [guestGuard],
    title: 'Restablecer contraseña · SIDEP',
    loadComponent: loadPasswordResetComponent,
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: loadMainLayoutComponent,
    children: [
      { path: '', title: 'Estadísticas · SIDEP', loadComponent: loadDashboardComponent },
      {
        path: 'partes/nuevo',
        title: 'Nuevo parte · SIDEP',
        canDeactivate: [edicionPendienteGuard],
        loadComponent: loadParteNuevoComponent,
      },
      {
        path: 'partes/:id',
        title: 'Detalle de parte · SIDEP',
        loadComponent: loadParteDetalleComponent,
      },
      {
        path: 'partes',
        title: 'Partes de emergencia · SIDEP',
        loadComponent: loadPartesListaComponent,
      },
      {
        path: 'catalogo-emergencias',
        canActivate: [catalogoEmergenciasGuard],
        title: 'Tipos de emergencia · SIDEP',
        loadComponent: loadCatalogoTiposEmergenciaComponent,
      },
      {
        path: 'carros/:id',
        title: 'Detalle carro · SIDEP',
        loadComponent: loadCarrosPageComponent,
      },
      {
        path: 'carros',
        title: 'Carros · SIDEP',
        loadComponent: loadCarrosPageComponent,
      },
      { path: 'inventarios/bodega', ...rutaPlaceholder('Inventarios — Bodega') },
      { path: 'inventarios', ...rutaPlaceholder('Inventarios') },
      {
        path: 'checklist-era',
        title: 'Checklist ERA · SIDEP',
        canDeactivate: [edicionPendienteGuard],
        loadComponent: loadChecklistEraComponent,
      },
      {
        path: 'checklist/:unidad',
        title: 'Checklist por unidad · SIDEP',
        canDeactivate: [edicionPendienteGuard],
        loadComponent: loadChecklistUnidadComponent,
      },
      {
        path: 'checklist',
        title: 'Checklist · SIDEP',
        loadComponent: loadChecklistSelectorComponent,
      },
      {
        path: 'bolso-trauma',
        loadComponent: loadBolsoTraumaShellComponent,
        children: [
          {
            path: '',
            title: 'Bolso de trauma · SIDEP',
            loadComponent: loadBolsoTraumaComponent,
          },
          {
            path: ':unidad',
            title: 'Registro bolso de trauma · SIDEP',
            canDeactivate: [edicionPendienteGuard],
            loadComponent: loadBolsoTraumaRegistroComponent,
          },
        ],
      },
      {
        path: 'usuarios',
        canActivate: [gestionUsuariosGuard],
        title: 'Usuarios · SIDEP',
        loadComponent: loadUsuariosComponent,
      },
      {
        path: 'configuraciones',
        canActivate: [adminGuard],
        title: 'Configuraciones · SIDEP',
        loadComponent: loadConfiguracionesComponent,
      },
      {
        path: 'auditoria',
        canActivate: [adminGuard],
        loadComponent: loadAuditoriaShellComponent,
        children: [
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          {
            path: 'dashboard',
            title: 'Auditoría · Panel · SIDEP',
            loadComponent: loadAuditoriaDashboardComponent,
          },
          {
            path: 'checklists',
            title: 'Auditoría · Checklists · SIDEP',
            loadComponent: loadAuditoriaChecklistsComponent,
          },
          {
            path: 'usuarios',
            title: 'Auditoría · Usuarios · SIDEP',
            loadComponent: loadAuditoriaUsuariosComponent,
          },
          {
            path: 'log',
            title: 'Auditoría · Trazabilidad · SIDEP',
            loadComponent: loadAuditoriaLogComponent,
          },
        ],
      },
      {
        path: 'perfil',
        title: 'Mi perfil · SIDEP',
        loadComponent: loadMiPerfilComponent,
      },
      {
        path: 'cambiar-password-inicial',
        title: 'Cambiar contraseña · SIDEP',
        loadComponent: loadCambiarPasswordInicialComponent,
      },
      {
        path: 'licencias',
        redirectTo: 'licencias-medicas',
        pathMatch: 'full',
      },
      {
        path: 'licencias-medicas',
        title: 'Licencias · SIDEP',
        loadComponent: loadLicenciasPageComponent,
      },
      {
        path: 'analitica-operacional',
        title: 'Analítica operacional · SIDEP',
        loadComponent: loadAnaliticaPageComponent,
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
