import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ConfirmDialogService } from '../services/confirm-dialog.service';
import { MotionProfileService } from '../services/motion-profile.service';
import { SidepIconsModule } from '../shared/sidep-icons.module';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';

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
  imports: [CommonModule, RouterOutlet, RouterLink, SidepIconsModule, ConfirmDialogComponent],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly motionProfile = inject(MotionProfileService);
  sidebarAbierto = false;
  routeTransitioning = false;

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

  constructor() {
    this.motionProfile.aplicar();
    this.router.events.subscribe((ev) => {
      if (ev instanceof NavigationEnd) {
        this.routeTransitioning = true;
        setTimeout(() => {
          this.routeTransitioning = false;
        }, 220);
      }
    });
  }

  get sections(): NavSection[] {
    const rol = this.auth.usuarioActual?.rol?.toUpperCase();
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
      : 'border border-slate-700/70 bg-[#141414] text-gray-200 hover:border-slate-500/80 hover:bg-[#1b1b1b] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-red-500/40';
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
