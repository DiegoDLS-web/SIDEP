import { Component, DestroyRef, HostListener, OnDestroy, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NavegacionUiService } from '../services/navegacion-ui.service';
import { ConfirmDialogService } from '../services/confirm-dialog.service';
import { MotionProfileService } from '../services/motion-profile.service';
import { UiDensityService } from '../services/ui-density.service';
import { SidepIconsModule } from '../shared/sidep-icons.module';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';
import { ConfiguracionesService } from '../services/configuraciones.service';
import { SidepBrandLockupComponent } from '../shared/sidep-brand-lockup.component';
import type { SesionUsuarioDto } from '../models/auth.dto';
import { WelcomeOverlayComponent } from '../shared/welcome-overlay.component';

type NavItem = {
  routerLink: string;
  label: string;
  icon: string;
  /** Solo para la ruta índice */
  exact?: boolean;
  /** Ej. bolso-trauma con hijos */
  activePrefix?: string;
};

type NavSection = { title: string; items: NavItem[] };

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    SidepIconsModule,
    ConfirmDialogComponent,
    SidepBrandLockupComponent,
    WelcomeOverlayComponent,
  ],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly navUi = inject(NavegacionUiService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly motionProfile = inject(MotionProfileService);
  private readonly uiDensity = inject(UiDensityService);
  private readonly configApi = inject(ConfiguracionesService);
  /** Subtítulo del lockup desde configuración del sistema. */
  readonly nombreCompaniaTag = signal<string | null>(null);
  sidebarAbierto = false;
  routeTransitioning = false;

  /** Splash de bienvenida cada vez que el layout arranca autenticado (login, F5, URL directa con token). */
  readonly bienvenidaVisible = signal(false);
  readonly bienvenidaSalida = signal(false);
  readonly nombreBienvenida = signal('');
  private bienvenidaTimer: ReturnType<typeof setTimeout> | null = null;
  private bienvenidaCierreTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly baseSections: NavSection[] = [
    {
      title: 'PRINCIPAL',
      items: [
        { routerLink: '/', label: 'Estadísticas', icon: 'layout-dashboard', exact: true },
        { routerLink: '/partes', label: 'Partes', icon: 'file-text' },
      ],
    },
    {
      title: 'OPERACIONES',
      items: [
        { routerLink: '/carros', label: 'Carros', icon: 'truck' },
        { routerLink: '/checklist', label: 'Checklist', icon: 'clipboard-list' },
        { routerLink: '/checklist-era', label: 'Checklist ERA', icon: 'shield' },
        {
          routerLink: '/bolso-trauma',
          label: 'Bolso de Trauma',
          icon: 'briefcase',
          activePrefix: '/bolso-trauma',
        },
        { routerLink: '/licencias-medicas', label: 'Licencias', icon: 'heart-pulse' },
        { routerLink: '/analitica-operacional', label: 'Analítica operacional', icon: 'chart-column' },
      ],
    },
    {
      title: 'SISTEMA',
      items: [
        { routerLink: '/usuarios', label: 'Usuarios', icon: 'users' },
        { routerLink: '/configuraciones', label: 'Configuraciones', icon: 'settings' },
      ],
    },
  ];

  /**
   * Secciones visibles según `/api/auth/mi-navegacion` (configurable en Administración · Configuraciones).
   */
  readonly sectionesSidebar = computed(() => {
    if (!this.navUi.cargada()) {
      return this.seccionesFallbackLegacy(this.auth.usuarioActual?.rol);
    }
    return this.filtrarSeccionesPorRutas(this.navUi.permitidasSet());
  });

  constructor() {
    this.motionProfile.aplicar();
    this.uiDensity.aplicar();
    this.auth.usuario$.subscribe((u) => {
      if (u) {
        this.navUi.refrescar();
      } else {
        this.navUi.limpiar();
      }
    });
    this.router.events.subscribe((ev) => {
      if (ev instanceof NavigationEnd) {
        this.routeTransitioning = true;
        setTimeout(() => {
          this.routeTransitioning = false;
        }, 220);
      }
    });
    this.configApi.brandingPublic().subscribe({
      next: (b) => this.nombreCompaniaTag.set(b.nombreCompania?.trim() || null),
      error: () => this.nombreCompaniaTag.set('1ª Compañía Santa Juana'),
    });
    this.auth
      .cargarSesion()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((u) => {
        if (u) {
          this.mostrarBienvenidaSesionActivada(u);
        }
      });
  }

  ngOnDestroy(): void {
    this.limpiarTimersBienvenida();
  }

  private limpiarTimersBienvenida(): void {
    if (this.bienvenidaTimer) {
      clearTimeout(this.bienvenidaTimer);
      this.bienvenidaTimer = null;
    }
    if (this.bienvenidaCierreTimer) {
      clearTimeout(this.bienvenidaCierreTimer);
      this.bienvenidaCierreTimer = null;
    }
  }

  private mostrarBienvenidaSesionActivada(u: SesionUsuarioDto): void {
    const nombre = (u.nombre ?? '').trim() || 'Usuario';
    this.nombreBienvenida.set(nombre);
    this.bienvenidaSalida.set(false);
    this.bienvenidaVisible.set(true);
    const reduced =
      typeof globalThis.matchMedia === 'function' &&
      globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ms = reduced ? 2400 : 4400;
    this.bienvenidaTimer = setTimeout(() => this.iniciarCierreBienvenida(), ms);
  }

  iniciarCierreBienvenida(): void {
    if (!this.bienvenidaVisible() || this.bienvenidaSalida()) return;
    this.limpiarTimersBienvenida();
    this.bienvenidaSalida.set(true);
    this.bienvenidaCierreTimer = setTimeout(() => {
      this.bienvenidaVisible.set(false);
      this.bienvenidaSalida.set(false);
      this.bienvenidaCierreTimer = null;
    }, 520);
  }

  cerrarBienvenidaUsuario(): void {
    if (this.bienvenidaTimer) {
      clearTimeout(this.bienvenidaTimer);
      this.bienvenidaTimer = null;
    }
    this.iniciarCierreBienvenida();
  }

  private seccionesFallbackLegacy(rolRaw: string | undefined): NavSection[] {
    const rol = rolRaw?.toUpperCase();
    if (rol === 'ADMIN') {
      return this.baseSections;
    }
    if (rol === 'CAPITAN' || rol === 'TENIENTE') {
      return this.baseSections.map((section) => {
        if (section.title !== 'SISTEMA') {
          return section;
        }
        return {
          ...section,
          items: section.items.filter((item) => item.routerLink !== '/configuraciones'),
        };
      });
    }
    return this.baseSections.filter((section) => section.title !== 'SISTEMA');
  }

  private filtrarSeccionesPorRutas(allowed: ReadonlySet<string>): NavSection[] {
    const out: NavSection[] = [];
    for (const section of this.baseSections) {
      const items = section.items.filter((item) => {
        const clave = item.activePrefix ?? item.routerLink;
        return allowed.has(clave);
      });
      if (items.length > 0) {
        out.push({ ...section, items });
      }
    }
    return out;
  }

  navActive(item: NavItem): boolean {
    const url = (this.router.url.split('?')[0] || '/').replace(/\/$/, '') || '/';
    if (item.routerLink === '/') {
      return url === '/' || url === '';
    }
    if (item.activePrefix) {
      return url.startsWith(item.activePrefix);
    }
    if (item.exact) {
      return url === item.routerLink;
    }
    return url === item.routerLink || url.startsWith(`${item.routerLink}/`);
  }

  navClasses(active: boolean): string {
    return active
      ? 'bg-red-600 text-white shadow-sm shadow-black/30 ring-1 ring-red-400/35'
      : 'border border-transparent bg-transparent text-gray-200 hover:border-slate-700/60 hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-red-500/40';
  }

  toggleSidebar(): void {
    this.sidebarAbierto = !this.sidebarAbierto;
  }

  cerrarSidebar(): void {
    this.sidebarAbierto = false;
  }

  saltarAlContenido(ev: Event): void {
    ev.preventDefault();
    const el = document.getElementById('main-content');
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  @HostListener('document:keydown.escape')
  onEscapeCerrarSidebar(): void {
    if (this.bienvenidaVisible()) {
      this.cerrarBienvenidaUsuario();
      return;
    }
    if (this.sidebarAbierto) {
      this.sidebarAbierto = false;
    }
  }

  get nombreUsuario(): string {
    return this.auth.usuarioActual?.nombre || 'Usuario';
  }

  get rolUsuario(): string {
    return this.auth.usuarioActual?.rol || '—';
  }

  get inicialesUsuario(): string {
    return this.nombreUsuario
      .split(' ')
      .map((x) => x[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  async logout(): Promise<void> {
    const ok = await this.confirmDialog.abrir({
      title: 'Cerrar sesión',
      message: '¿Estás seguro de que quieres cerrar tu sesión actual en SIDEP?',
      confirmText: 'Sí, cerrar sesión',
      cancelText: 'Seguir en SIDEP',
      variant: 'logout',
    });
    if (!ok) return;
    this.auth.logout();
  }

}
