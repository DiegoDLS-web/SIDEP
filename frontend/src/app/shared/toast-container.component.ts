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
            class="toast-card pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-2xl border px-4 py-3 text-sm shadow-xl ring-1 ring-inset backdrop-blur-md"
            [ngClass]="[clasesToast(t.tipo), claseCinematica(t)]"
          >
            <span class="absolute inset-y-0 left-0 w-1.5" [ngClass]="claseAcento(t.tipo)"></span>
            <span
              class="toast-icon mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm"
              [ngClass]="[claseIcono(t.tipo), claseIconoCinematico(t)]"
              [attr.aria-hidden]="true"
            >
              {{ icono(t.tipo) }}
            </span>
            <p class="min-w-0 flex-1 leading-snug text-gray-100">{{ t.mensaje }}</p>
            <button
              type="button"
              class="shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              (click)="cerrar(t.id)"
              aria-label="Cerrar aviso"
            >
              ×
            </button>
            <span
              class="toast-progress absolute bottom-0 left-0 h-[2px] w-full origin-left"
              [ngClass]="[claseAcento(t.tipo), claseAcentoCinematico(t)]"
              [style.animationDuration.ms]="t.duracionMs"
            ></span>
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

      .toast-card {
        animation: toastIn 0.24s ease-out;
      }

      .toast-card.cine-save {
        box-shadow:
          0 10px 30px rgba(16, 185, 129, 0.18),
          0 0 0 1px rgba(16, 185, 129, 0.14) inset;
      }

      .toast-card.cine-delete {
        box-shadow:
          0 12px 34px rgba(244, 63, 94, 0.2),
          0 0 0 1px rgba(251, 113, 133, 0.14) inset;
      }

      .toast-card.cine-session {
        box-shadow:
          0 12px 34px rgba(139, 92, 246, 0.2),
          0 0 0 1px rgba(167, 139, 250, 0.16) inset;
      }

      .toast-progress {
        animation-name: toastProgress;
        animation-timing-function: linear;
        animation-fill-mode: forwards;
      }

      .toast-icon {
        box-shadow: 0 0 0 1px rgb(255 255 255 / 0.14) inset;
      }

      .toast-icon-success {
        animation: tickPop 0.34s cubic-bezier(0.22, 1, 0.36, 1);
      }

      .toast-icon-error {
        animation: errorShake 0.38s cubic-bezier(0.2, 0.8, 0.2, 1);
      }

      .toast-icon-warning {
        animation: warningPulse 0.6s ease-out;
      }

      .toast-icon-info {
        animation: infoFloat 0.4s ease-out;
      }

      .toast-icon-cine-save {
        animation: tickPop 0.34s cubic-bezier(0.22, 1, 0.36, 1), glowPulse 1.1s ease-out;
      }

      .toast-icon-cine-delete {
        animation: errorShake 0.38s cubic-bezier(0.2, 0.8, 0.2, 1), glowPulseDanger 0.9s ease-out;
      }

      .toast-icon-cine-session {
        animation: orbitIn 0.48s cubic-bezier(0.22, 1, 0.36, 1);
      }

      @keyframes toastIn {
        from {
          opacity: 0;
          transform: translateY(8px) scale(0.97);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes tickPop {
        0% {
          transform: scale(0.7);
        }
        70% {
          transform: scale(1.1);
        }
        100% {
          transform: scale(1);
        }
      }

      @keyframes errorShake {
        0% {
          transform: translateX(0);
        }
        20% {
          transform: translateX(-2px);
        }
        40% {
          transform: translateX(2px);
        }
        60% {
          transform: translateX(-1px);
        }
        80% {
          transform: translateX(1px);
        }
        100% {
          transform: translateX(0);
        }
      }

      @keyframes warningPulse {
        0% {
          transform: scale(0.9);
          opacity: 0.85;
        }
        60% {
          transform: scale(1.08);
          opacity: 1;
        }
        100% {
          transform: scale(1);
        }
      }

      @keyframes infoFloat {
        0% {
          transform: translateY(3px);
          opacity: 0.7;
        }
        100% {
          transform: translateY(0);
          opacity: 1;
        }
      }

      @keyframes toastProgress {
        from {
          transform: scaleX(1);
          opacity: 0.85;
        }
        to {
          transform: scaleX(0);
          opacity: 0.35;
        }
      }

      @keyframes glowPulse {
        0% {
          box-shadow: 0 0 0 rgba(16, 185, 129, 0);
        }
        100% {
          box-shadow: 0 0 16px rgba(16, 185, 129, 0.55);
        }
      }

      @keyframes glowPulseDanger {
        0% {
          box-shadow: 0 0 0 rgba(244, 63, 94, 0);
        }
        100% {
          box-shadow: 0 0 16px rgba(244, 63, 94, 0.55);
        }
      }

      @keyframes orbitIn {
        0% {
          transform: rotate(-25deg) scale(0.8);
          opacity: 0.65;
        }
        100% {
          transform: rotate(0deg) scale(1);
          opacity: 1;
        }
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
        return 'border-emerald-700/50 bg-[linear-gradient(135deg,rgba(6,95,70,.92),rgba(2,44,34,.95))] ring-emerald-500/20';
      case 'error':
        return 'border-red-700/50 bg-[linear-gradient(135deg,rgba(127,29,29,.92),rgba(69,10,10,.95))] ring-red-500/20';
      case 'warning':
        return 'border-amber-700/50 bg-[linear-gradient(135deg,rgba(120,53,15,.92),rgba(69,26,3,.95))] ring-amber-500/20';
      default:
        return 'border-slate-600/60 bg-[linear-gradient(135deg,rgba(30,41,59,.93),rgba(15,23,42,.95))] ring-slate-400/20';
    }
  }

  claseAcento(tipo: ToastItem['tipo']): string {
    switch (tipo) {
      case 'success':
        return 'bg-emerald-400/90';
      case 'error':
        return 'bg-red-400/90';
      case 'warning':
        return 'bg-amber-400/90';
      default:
        return 'bg-sky-400/80';
    }
  }

  claseIcono(tipo: ToastItem['tipo']): string {
    switch (tipo) {
      case 'success':
        return 'bg-emerald-500/20 text-emerald-200 toast-icon-success';
      case 'error':
        return 'bg-red-500/20 text-red-200 toast-icon-error';
      case 'warning':
        return 'bg-amber-500/20 text-amber-100 toast-icon-warning';
      default:
        return 'bg-sky-500/20 text-sky-100 toast-icon-info';
    }
  }

  claseCinematica(t: ToastItem): string {
    const m = this.normalizar(t.mensaje);
    if (this.esSave(m)) return 'cine-save';
    if (this.esDelete(m)) return 'cine-delete';
    if (this.esSession(m)) return 'cine-session';
    return '';
  }

  claseIconoCinematico(t: ToastItem): string {
    const m = this.normalizar(t.mensaje);
    if (this.esSave(m)) return 'toast-icon-cine-save';
    if (this.esDelete(m)) return 'toast-icon-cine-delete';
    if (this.esSession(m)) return 'toast-icon-cine-session';
    return '';
  }

  claseAcentoCinematico(t: ToastItem): string {
    const m = this.normalizar(t.mensaje);
    if (this.esSave(m)) return 'shadow-[0_0_10px_rgba(16,185,129,0.85)]';
    if (this.esDelete(m)) return 'shadow-[0_0_10px_rgba(251,113,133,0.85)]';
    if (this.esSession(m)) return 'shadow-[0_0_10px_rgba(167,139,250,0.9)]';
    return '';
  }

  private normalizar(msg: string): string {
    return String(msg ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private esSave(m: string): boolean {
    return m.includes('guard') || m.includes('actualiz') || m.includes('registr');
  }

  private esDelete(m: string): boolean {
    return m.includes('elimin') || m.includes('borr');
  }

  private esSession(m: string): boolean {
    return m.includes('sesion') || m.includes('logout');
  }
}
