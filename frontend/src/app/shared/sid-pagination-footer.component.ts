import { Component, input, output } from '@angular/core';

/**
 * Pie de paginación unificado para historiales SIDEP.
 * Patrón: «Página X de Y · N registro(s) · Z por página» (opcional).
 */
@Component({
  selector: 'app-sid-pagination-footer',
  standalone: true,
  template: `
    @if (compact()) {
      <div class="flex shrink-0 items-center gap-2 text-sm sid-muted tabular-nums">
        <span>Página {{ page() }} de {{ totalPages() }}</span>
        <button
          type="button"
          class="sid-btn sid-btn-neutral rounded-lg border border-gray-600 px-2 py-1 text-xs disabled:opacity-40"
          [disabled]="page() <= 1 || navDisabled()"
          (click)="pageDelta.emit(-1)"
          aria-label="Página anterior"
        >
          ‹
        </button>
        <button
          type="button"
          class="sid-btn sid-btn-neutral rounded-lg border border-gray-600 px-2 py-1 text-xs disabled:opacity-40"
          [disabled]="page() >= totalPages() || navDisabled()"
          (click)="pageDelta.emit(1)"
          aria-label="Página siguiente"
        >
          ›
        </button>
      </div>
    } @else {
      <div
        class="sid-pagination-footer mt-4 flex flex-col gap-3 border-t border-gray-800 pt-4 sm:flex-row sm:items-center sm:justify-between"
        [class.!mt-0]="embedded()"
        [class.!border-t-0]="embedded()"
        [class.!pt-0]="embedded()"
      >
        <p class="text-sm sid-muted tabular-nums">
          Página {{ page() }} de {{ totalPages() }}
          · {{ totalRecords() }} {{ recordUnit() }}{{ suffix() ? ' ' + suffix() : '' }}
          @if (pageSize(); as ps) {
            · {{ ps }} por página
          }
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="sid-btn sid-btn-neutral rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-white disabled:opacity-40"
            [disabled]="page() <= 1 || navDisabled()"
            (click)="pageDelta.emit(-1)"
          >
            Anterior
          </button>
          <button
            type="button"
            class="sid-btn sid-btn-neutral rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-white disabled:opacity-40"
            [disabled]="page() >= totalPages() || navDisabled()"
            (click)="pageDelta.emit(1)"
          >
            Siguiente
          </button>
        </div>
      </div>
    }
  `,
})
export class SidPaginationFooterComponent {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly totalRecords = input.required<number>();
  /** Etiqueta del conteo: «registro(s)», «resultado(s)», «usuario(s)», etc. */
  readonly recordUnit = input<string>('registro(s)');
  /** Si se omite, no se muestra «· N por página». */
  readonly pageSize = input<number | null>(null);
  /** Texto extra tras la unidad, p. ej. «con filtros». */
  readonly suffix = input<string>('');
  /** Deshabilita navegación (p. ej. mientras carga). */
  readonly navDisabled = input(false);
  /** Variante compacta para cabeceras de tabla. */
  readonly compact = input(false);
  /** Sin borde superior (dentro de paneles con padding propio). */
  readonly embedded = input(false);

  readonly pageDelta = output<number>();
}
