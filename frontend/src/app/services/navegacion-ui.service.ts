import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { rutasMenuFallbackPorRol } from '../layout/nav-menu-opciones';

@Injectable({ providedIn: 'root' })
export class NavegacionUiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly rutasSig = signal<string[]>([]);
  readonly cargada = signal(false);

  /** Conjunto de rutas permitidas para el usuario actual */
  readonly permitidasSet = computed(() => new Set(this.rutasSig()));

  puedeVerRuta(path: string): boolean {
    return this.rutasSig().includes(path);
  }

  limpiar(): void {
    this.rutasSig.set([]);
    this.cargada.set(false);
  }

  refrescar(): void {
    const u = this.auth.usuarioActual;
    if (!u) {
      this.limpiar();
      return;
    }
    this.http.get<{ paths: string[] }>('/api/auth/mi-navegacion').subscribe({
      next: (resp) => {
        this.rutasSig.set(resp.paths ?? []);
        this.cargada.set(true);
      },
      error: () => {
        this.rutasSig.set(rutasMenuFallbackPorRol(u.rol));
        this.cargada.set(true);
      },
    });
  }
}
