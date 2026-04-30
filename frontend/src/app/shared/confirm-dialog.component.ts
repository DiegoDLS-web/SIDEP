import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { ConfirmDialogService } from '../services/confirm-dialog.service';
import { SidepIconsModule } from './sidep-icons.module';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, AsyncPipe, SidepIconsModule],
  template: `
    @if (vm$ | async; as vm) {
      @if (vm.open) {
        <div
          class="confirm-overlay fixed inset-0 z-[230] flex items-center justify-center bg-black/45 p-4"
          [class.confirm-overlay-logout]="vm.variant === 'logout'"
          (click)="cancelar()"
        >
          <div
            class="confirm-dialog w-full max-w-md rounded-2xl border border-slate-700 bg-[linear-gradient(145deg,#111827,#0b1220)] p-5 shadow-2xl shadow-black/60 ring-1 ring-inset ring-white/5"
            [class.confirm-dialog-logout]="vm.variant === 'logout'"
            role="dialog"
            aria-modal="true"
            (click)="$event.stopPropagation()"
          >
            <div class="mb-3 flex items-center gap-3">
              <div
                class="confirm-icon-wrap flex h-10 w-10 items-center justify-center rounded-xl ring-1"
                [class.bg-red-600/20]="vm.variant !== 'logout'"
                [class.text-red-300]="vm.variant !== 'logout'"
                [class.ring-red-500/30]="vm.variant !== 'logout'"
                [class.bg-violet-600/20]="vm.variant === 'logout'"
                [class.text-violet-200]="vm.variant === 'logout'"
                [class.ring-violet-400/40]="vm.variant === 'logout'"
              >
                <lucide-icon
                  [name]="vm.variant === 'logout' ? 'log-out' : 'triangle-alert'"
                  class="h-5 w-5"
                  [size]="20"
                  color="currentColor"
                />
              </div>
              <div>
                <h3 class="text-base font-semibold text-white">{{ vm.title }}</h3>
                <p class="text-xs text-slate-400">
                  {{ vm.variant === 'logout' ? 'Cierre seguro de sesión' : 'Esta acción puede ser irreversible' }}
                </p>
              </div>
            </div>
            <p class="mb-5 text-sm text-slate-200">{{ vm.message }}</p>
            <div class="flex justify-end gap-2">
              <button
                type="button"
                class="rounded-lg border border-slate-600 bg-slate-800/70 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
                (click)="cancelar()"
              >
                {{ vm.cancelText }}
              </button>
              <button
                type="button"
                class="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                [class.bg-red-600]="vm.variant !== 'logout'"
                [class.hover:bg-red-700]="vm.variant !== 'logout'"
                [class.bg-violet-600]="vm.variant === 'logout'"
                [class.hover:bg-violet-700]="vm.variant === 'logout'"
                (click)="confirmar()"
              >
                {{ vm.confirmText }}
              </button>
            </div>
          </div>
        </div>
      }
    }
  `,
  styles: [
    `
      .confirm-overlay {
        animation: overlayIn 0.18s ease-out;
        backdrop-filter: blur(3px);
      }
      .confirm-overlay-logout {
        backdrop-filter: blur(7px) saturate(1.15);
      }
      .confirm-dialog {
        animation: dialogIn 0.24s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .confirm-dialog-logout {
        border-color: rgba(167, 139, 250, 0.45);
        background: radial-gradient(circle at 20% 0%, rgba(139, 92, 246, 0.26), transparent 50%),
          linear-gradient(145deg, #0f1326, #0b1020);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(167, 139, 250, 0.15) inset;
      }
      .confirm-dialog-logout .confirm-icon-wrap {
        animation: logoutIconPulse 1.35s ease-in-out infinite;
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
      @keyframes logoutIconPulse {
        0%,
        100% {
          transform: scale(1);
          box-shadow: 0 0 0 rgba(139, 92, 246, 0.35);
        }
        50% {
          transform: scale(1.08);
          box-shadow: 0 0 18px rgba(139, 92, 246, 0.45);
        }
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  private readonly confirm = inject(ConfirmDialogService);
  readonly vm$ = this.confirm.state$;

  confirmar(): void {
    this.confirm.confirmar();
  }

  cancelar(): void {
    this.confirm.cancelar();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.confirm.cancelar();
  }
}
