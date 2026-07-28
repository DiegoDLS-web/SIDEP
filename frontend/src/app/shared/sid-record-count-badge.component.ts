import { Component, input } from '@angular/core';

/** Insignia «Registros: N» para cabeceras de listados/historiales. */
@Component({
  selector: 'app-sid-record-count-badge',
  standalone: true,
  template: `
    <span
      class="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400 tabular-nums"
      role="status"
    >
      {{ label() }}:
      <strong class="font-semibold text-white">{{ count() }}</strong>
    </span>
  `,
})
export class SidRecordCountBadgeComponent {
  readonly count = input.required<number>();
  readonly label = input<string>('Registros');
}
