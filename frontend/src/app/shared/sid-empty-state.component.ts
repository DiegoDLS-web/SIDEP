import { Component, input } from '@angular/core';
import { SidepIconsModule } from './sidep-icons.module';

/**
 * Estado vacío reutilizable (SRP: solo presentación).
 * Estilos globales: `.sid-empty-state` / `.sid-empty-state--compact` en `styles.scss`.
 */
@Component({
  selector: 'app-sid-empty-state',
  standalone: true,
  imports: [SidepIconsModule],
  template: `
    <div
      class="sid-empty-state"
      [class.sid-empty-state--compact]="compact()"
      role="status"
    >
      @if (icon(); as ic) {
        <lucide-icon
          [name]="ic"
          [class]="compact() ? 'sid-empty-icon h-6 w-6 text-[var(--sid-text-muted)]' : 'sid-empty-icon h-10 w-10 text-[var(--sid-text-muted)]'"
          [size]="compact() ? 22 : 40"
          color="currentColor"
          aria-hidden="true"
        />
      }
      <div [class]="compact() ? 'w-full' : 'max-w-md'">
        <p [class]="compact() ? 'text-sm font-semibold text-[var(--sid-text)]' : 'text-base font-semibold text-[var(--sid-text)]'">
          {{ title() }}
        </p>
        @if (description(); as d) {
          <p class="mt-1 text-sm sid-muted">{{ d }}</p>
        }
      </div>
      <ng-content />
    </div>
  `,
})
export class SidEmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  /** Nombre de icono Lucide registrado; null = sin icono */
  readonly icon = input<string | null>('file-text');
  /** Listados densos o celdas @empty: menos padding e icono más pequeño */
  readonly compact = input(false);
}
