import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { CambioEstadoDialogService } from '../services/cambio-estado-dialog.service';
import { SidepIconsModule } from './sidep-icons.module';
import { SidDateInputComponent } from './sid-date-input.component';

@Component({
  selector: 'app-cambio-estado-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, SidepIconsModule, SidDateInputComponent],
  template: `
    @if (vm().open) {
      <div
        class="confirm-overlay fixed inset-0 z-[235] flex items-center justify-center bg-black/50 p-4"
        (click)="cancelar()"
      >
        <div
          class="confirm-dialog flex max-h-[min(92vh,640px)] w-full max-w-lg flex-col rounded-2xl border border-slate-700 bg-[linear-gradient(145deg,#111827,#0b1220)] shadow-2xl shadow-black/60 ring-1 ring-inset ring-white/5"
          role="dialog"
          aria-modal="true"
          (click)="$event.stopPropagation()"
        >
          <div class="sid-modal-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
            <div class="mb-3 flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600/20 text-amber-200 ring-1 ring-amber-500/30"
                aria-hidden="true"
              >
                <lucide-icon name="triangle-alert" class="h-5 w-5" [size]="20" color="currentColor" />
              </div>
              <div>
                <h3 class="text-base font-semibold text-white">{{ vm().title }}</h3>
                <p class="text-xs text-slate-400">Quedará registrado quién cambió el estado y por qué.</p>
              </div>
            </div>

            <p class="mb-4 text-sm text-slate-200">{{ vm().message }}</p>

            @if (vm().estadoAnterior || vm().estadoNuevo) {
              <div class="mb-4 rounded-xl border border-slate-700/80 bg-black/30 px-4 py-3 text-sm text-slate-300">
                @if (vm().estadoAnterior) {
                  <p><span class="text-slate-500">Estado actual:</span> {{ vm().estadoAnterior }}</p>
                }
                @if (vm().estadoNuevo) {
                  <p class="mt-1"><span class="text-slate-500">Nuevo estado:</span> {{ vm().estadoNuevo }}</p>
                }
              </div>
            }

            @if (vm().error) {
              <p class="mb-3 rounded-lg border border-red-800/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
                {{ vm().error }}
              </p>
            }

            <label class="mb-3 block text-sm text-slate-300">
              Motivo del cambio <span class="text-red-400">*</span>
              <textarea
                class="mt-1.5 min-h-[88px] w-full rounded-lg border border-slate-600 bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                [ngModel]="vm().motivo"
                (ngModelChange)="onMotivo($event)"
                placeholder="Ej.: Falla de bomba, revisión taller, material crítico repuesto…"
              ></textarea>
            </label>

            <label class="mb-1 block text-sm text-slate-300">
              Fecha del cambio <span class="text-red-400">*</span>
            </label>
            <app-sid-date-input
              [ngModel]="vm().fecha"
              (ngModelChange)="onFecha($event)"
            />
          </div>

          <div class="flex shrink-0 justify-end gap-2 border-t border-slate-800/90 bg-[#0b1220]/95 p-5 pt-4">
            <button
              type="button"
              class="rounded-lg border border-slate-600 bg-slate-800/70 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
              (click)="cancelar()"
            >
              {{ vm().cancelText }}
            </button>
            <button
              type="button"
              class="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
              (click)="confirmar()"
            >
              {{ vm().confirmText }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .confirm-overlay {
        animation: overlayIn 0.18s ease-out;
        backdrop-filter: blur(3px);
      }
      .confirm-dialog {
        animation: dialogIn 0.24s cubic-bezier(0.22, 1, 0.36, 1);
      }
      @keyframes overlayIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes dialogIn {
        from {
          opacity: 0;
          transform: translateY(10px) scale(0.96);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `,
  ],
})
export class CambioEstadoDialogComponent {
  private readonly dialog = inject(CambioEstadoDialogService);

  readonly vm = toSignal(this.dialog.state$, {
    initialValue: {
      open: false,
      title: '',
      message: '',
      confirmText: 'Confirmar cambio',
      cancelText: 'Cancelar',
      motivo: '',
      fecha: new Date().toISOString().slice(0, 10),
      error: null,
      estadoAnterior: undefined,
      estadoNuevo: undefined,
    },
  });

  onMotivo(valor: string): void {
    this.dialog.actualizarMotivo(valor);
  }

  onFecha(valor: string): void {
    this.dialog.actualizarFecha(valor);
  }

  confirmar(): void {
    this.dialog.confirmar();
  }

  cancelar(): void {
    this.dialog.cancelar();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.dialog.cancelar();
  }
}
