import { Component, input } from '@angular/core';

/** Tarjeta de superficie alineada a tokens `--sid-*` (pilot para listados y paneles). */
@Component({
  selector: 'app-sid-card',
  standalone: true,
  host: {
    class: 'sid-card-host block rounded-2xl border border-[var(--sid-border)] bg-[var(--sid-surface-card)] shadow-lg shadow-black/20 ring-1 ring-inset ring-white/[0.05]',
    '[class.sid-card-host--pad]': `pad() === 'md'`,
    '[class.sid-card-host--pad-sm]': `pad() === 'sm'`,
  },
  template: ` <ng-content /> `,
  styles: `
    .sid-card-host--pad {
      padding: 1.25rem;
    }
    @media (min-width: 640px) {
      .sid-card-host--pad {
        padding: 1.5rem;
      }
    }
    .sid-card-host--pad-sm {
      padding: 1rem;
    }
  `,
})
export class SidCardComponent {
  readonly pad = input<'sm' | 'md'>('md');
}
