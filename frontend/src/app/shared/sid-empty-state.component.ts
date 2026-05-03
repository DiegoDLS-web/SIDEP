import { Component, input } from '@angular/core';
import { SidepIconsModule } from './sidep-icons.module';

@Component({
  selector: 'app-sid-empty-state',
  standalone: true,
  imports: [SidepIconsModule],
  template: `
    <div
      class="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--sid-border-strong)] bg-[var(--sid-surface-inset)] px-6 py-10 text-center"
      role="status"
    >
      @if (icon(); as ic) {
        <lucide-icon [name]="ic" class="h-10 w-10 text-[var(--sid-text-muted)]" [size]="40" color="currentColor" aria-hidden="true" />
      }
      <div>
        <p class="text-base font-semibold text-[var(--sid-text)]">{{ title() }}</p>
        @if (description(); as d) {
          <p class="mt-1 max-w-md text-sm sid-muted">{{ d }}</p>
        }
      </div>
      <ng-content />
    </div>
  `,
})
export class SidEmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  /** Nombre de icono Lucide registrado, o null para sin icono */
  readonly icon = input<string | null>('file-text');
}
