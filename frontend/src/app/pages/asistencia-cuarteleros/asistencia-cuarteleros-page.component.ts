import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

/** Redirige al módulo unificado de guardias (pestaña Asistencia). */
@Component({
  selector: 'app-asistencia-cuarteleros-page',
  standalone: true,
  template: `<p class="p-6 text-sm sid-muted">Redirigiendo a Sistema de guardias…</p>`,
})
export class AsistenciaCuartelerosPageComponent implements OnInit {
  private readonly router = inject(Router);

  ngOnInit(): void {
    void this.router.navigate(['/guardias'], { queryParams: { vista: 'asistencia' }, replaceUrl: true });
  }
}
