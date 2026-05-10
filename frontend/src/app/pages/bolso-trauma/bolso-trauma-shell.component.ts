import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Contenedor para lista (`/bolso-trauma`) y registro (`/bolso-trauma/:unidad`) sin ambigüedad en el router. */
@Component({
  selector: 'app-bolso-trauma-shell',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class BolsoTraumaShellComponent {}
