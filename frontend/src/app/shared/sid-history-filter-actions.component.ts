import { Component, input, output } from '@angular/core';
import { SIDEP_ACTION_ICON } from './sidep-action-icons';
import { SidepIconsModule } from './sidep-icons.module';

/**
 * Barra de acciones estándar para filtros de historiales (Aplicar, Limpiar, Actualizar, exportar).
 */
@Component({
  selector: 'app-sid-history-filter-actions',
  standalone: true,
  imports: [SidepIconsModule],
  template: `
    <div
      class="sid-filtros-bar__actions"
      [class.!border-t-0]="!borderTop()"
      [class.!pt-0]="!borderTop()"
    >
      @if (showApply()) {
        <button
          type="button"
          class="sid-btn sid-btn-primary sid-filter-action-btn"
          [disabled]="applyDisabled()"
          (click)="apply.emit()"
        >
          Aplicar filtros
        </button>
      }
      @if (showClear()) {
        <button
          type="button"
          class="sid-btn sid-btn-neutral sid-filter-action-btn"
          [disabled]="clearDisabled()"
          (click)="clear.emit()"
        >
          Limpiar filtros
        </button>
      }
      @if (showRefresh()) {
        <button
          type="button"
          class="sid-btn sid-btn-neutral sid-filter-action-btn"
          [disabled]="refreshDisabled()"
          (click)="refresh.emit()"
        >
          <lucide-icon name="refresh-cw" class="h-4 w-4" [size]="16" color="currentColor" aria-hidden="true"></lucide-icon>
          Actualizar
        </button>
      }
      @if (showPdf()) {
        <button
          type="button"
          class="sid-btn sid-btn-primary sid-filter-action-btn"
          [disabled]="exportPdfDisabled()"
          (click)="exportPdf.emit()"
        >
          <lucide-icon [name]="icon.pdf" class="h-4 w-4" [size]="16" color="currentColor" aria-hidden="true"></lucide-icon>
          Descargar PDF
        </button>
      }
      @if (showExcel()) {
        <button
          type="button"
          class="sid-btn sid-btn-success sid-filter-action-btn"
          [disabled]="exportExcelDisabled()"
          (click)="exportExcel.emit()"
        >
          <lucide-icon [name]="icon.excel" class="h-4 w-4" [size]="16" color="currentColor" aria-hidden="true"></lucide-icon>
          Descargar Excel
        </button>
      }
    </div>
  `,
})
export class SidHistoryFilterActionsComponent {
  readonly icon = SIDEP_ACTION_ICON;

  readonly showApply = input(true);
  readonly showClear = input(true);
  readonly showRefresh = input(true);
  readonly showPdf = input(true);
  readonly showExcel = input(true);

  readonly applyDisabled = input(false);
  readonly clearDisabled = input(false);
  readonly refreshDisabled = input(false);
  readonly exportPdfDisabled = input(false);
  readonly exportExcelDisabled = input(false);
  /** Muestra borde superior (por defecto sí, como en historiales). */
  readonly borderTop = input(true);

  readonly apply = output<void>();
  readonly clear = output<void>();
  readonly refresh = output<void>();
  readonly exportPdf = output<void>();
  readonly exportExcel = output<void>();
}
