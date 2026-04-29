import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ToastService, type ToastItem } from '../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [AsyncPipe, CommonModule],
  template: `
    @if (vm$ | async; as lista) {
      @if (lista.length > 0) {
      <div
        class="pointer-events-none fixed bottom-0 right-0 z-[200] flex max-h-[min(50vh,24rem)] w-full max-w-md flex-col gap-2 overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
        role="status"
        aria-live="polite"
      >
        @for (t of lista; track t.id) {
          <div
            class="pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-sm"
            [ngClass]="clasesToast(t.tipo)"
          >
            <span class="mt-0.5 shrink-0 text-base" [attr.aria-hidden]="true">{{ icono(t.tipo) }}</span>
            <p class="min-w-0 flex-1 leading-snug text-gray-100">{{ t.mensaje }}</p>
            <button
              type="button"
              class="shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              (click)="cerrar(t.id)"
              aria-label="Cerrar aviso"
            >
              ×
            </button>
          </div>
        }
      </div>
      }
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
})
export class ToastContainerComponent implements OnInit {
  private readonly toast = inject(ToastService);
  readonly vm$ = this.toast.items$;

  ngOnInit(): void {
    this.toast.consumirFlashAlIniciar();
  }

  cerrar(id: number): void {
    this.toast.cerrar(id);
  }

  icono(tipo: ToastItem['tipo']): string {
    switch (tipo) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  }

  clasesToast(tipo: ToastItem['tipo']): string {
    switch (tipo) {
      case 'success':
        return 'border-emerald-700/60 bg-emerald-950/90';
      case 'error':
        return 'border-red-700/60 bg-red-950/90';
      case 'warning':
        return 'border-amber-600/60 bg-amber-950/90';
      default:
        return 'border-[color:var(--sid-border-strong)] bg-[color:var(--sid-shell-aside)]/95';
    }
  }
}
