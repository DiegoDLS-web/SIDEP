import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Pantalla de bienvenida al arrancar sesión en el layout (login, recarga con token, bookmark).
 */
@Component({
  selector: 'app-welcome-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="sid-welcome-layer"
      [class.sid-welcome-layer--leave]="leaving()"
      role="dialog"
      (click)="skip.emit()"
      aria-modal="true"
      aria-labelledby="sid-welcome-heading"
      aria-describedby="sid-welcome-name"
    >
      <div class="sid-welcome-vignette" aria-hidden="true"></div>
      <div class="sid-welcome-orb sid-welcome-orb--a" aria-hidden="true"></div>
      <div class="sid-welcome-orb sid-welcome-orb--b" aria-hidden="true"></div>

      <button
        type="button"
        class="sid-welcome-skip"
        (click)="skip.emit(); $event.stopPropagation()"
        aria-label="Cerrar mensaje de bienvenida"
      >
        Continuar
      </button>

      <div class="sid-welcome-card" (click)="$event.stopPropagation()">
        <p class="sid-welcome-eyebrow">Bienvenido a</p>
        <h1 id="sid-welcome-heading" class="sid-welcome-brand">SIDEP</h1>
        <p id="sid-welcome-name" class="sid-welcome-name">{{ nombreUsuario() }}</p>
        <p class="sid-welcome-hint">Gracias por mantener la operación en marcha.</p>
      </div>
    </div>
  `,
})
export class WelcomeOverlayComponent {
  readonly nombreUsuario = input.required<string>();
  readonly leaving = input(false);
  readonly skip = output<void>();
}
