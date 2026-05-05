import { Injectable } from '@angular/core';

export type UiDensity = 'COMPACTO' | 'NORMAL' | 'COMODO';

@Injectable({ providedIn: 'root' })
export class UiDensityService {
  private static readonly KEY = 'sidep_ui_density';

  obtener(): UiDensity {
    const raw = localStorage.getItem(UiDensityService.KEY)?.trim().toUpperCase();
    if (raw === 'COMPACTO' || raw === 'NORMAL' || raw === 'COMODO') {
      return raw;
    }
    return 'NORMAL';
  }

  guardar(density: UiDensity): void {
    localStorage.setItem(UiDensityService.KEY, density);
    this.aplicar(density);
  }

  aplicar(density: UiDensity = this.obtener()): void {
    const body = document.body;
    body.classList.remove('density-compacto', 'density-normal', 'density-comodo');
    if (density === 'COMPACTO') body.classList.add('density-compacto');
    else if (density === 'COMODO') body.classList.add('density-comodo');
    else body.classList.add('density-normal');
  }
}
