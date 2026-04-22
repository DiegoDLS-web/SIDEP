import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SidepIconsModule } from '../shared/sidep-icons.module';

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
  imports: [CommonModule, RouterOutlet, RouterLink, SidepIconsModule],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  sidebarAbierto = false;

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
        { routerLink: '/checklist', label: 'Checklist', icon: 'clipboard-check' },
        { routerLink: '/checklist-era', label: 'Checklist ERA', icon: 'clipboard-check' },
        {
          routerLink: '/bolso-trauma',
          label: 'Bolso de Trauma',
          icon: 'briefcase',
          activePrefix: '/bolso-trauma',
        },
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
      ? 'bg-red-600 text-white'
      : 'text-gray-400 hover:text-white hover:bg-gray-800';
  }

  toggleSidebar(): void {
    this.sidebarAbierto = !this.sidebarAbierto;
  }

  cerrarSidebar(): void {
    this.sidebarAbierto = false;
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

  logout(): void {
    this.auth.logout();
  }
}
