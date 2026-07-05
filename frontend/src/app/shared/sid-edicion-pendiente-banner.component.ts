import { Component, Input } from '@angular/core';

/** Banner desactivado: la alerta «Cambios sin guardar» ya no se muestra en la UI. */
@Component({
  selector: 'app-sid-edicion-pendiente-banner',
  standalone: true,
  template: ``,
})
export class SidEdicionPendienteBannerComponent {
  @Input({ required: true }) visible = false;
}
