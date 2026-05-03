import { Component, computed, input, signal } from '@angular/core';
import { SIDEP_FULL_LOGO_PNG, SIDEP_MARK_PNG } from './sidep-branding';

export type SidepBrandMarkVariant = 'mark' | 'full';

/**
 * Marca SIDEP (PNG institucional) con halo y animaciones suaves.
 * Usar `variant="mark"` en sidebar/cabeceras; `variant="full"` en login.
 */
@Component({
  selector: 'app-sidep-brand-mark',
  standalone: true,
  host: {
    '[style.--sid-mark-dim]': 'dim()',
    '[class.sid-mark-variant-full]': 'variant() === "full"',
    class: 'sid-mark-root',
  },
  template: `
    <span class="sid-mark-host" aria-hidden="true">
      <span class="sid-mark-aura"></span>
      @if (!useFallback()) {
        <img
          class="sid-mark-img"
          [src]="logoSrc()"
          (error)="onImgError()"
          alt=""
          decoding="async"
          draggable="false"
        />
      } @else {
        <svg
          class="sid-mark-svg-fallback"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          focusable="false"
          aria-hidden="true"
        >
          <path
            class="sid-mark-fl-bg"
            d="M50 11 L82 29 L82 63 L50 81 L18 63 L18 29 Z"
            stroke="#323b44"
            stroke-width="2.2"
            stroke-linejoin="round"
            fill="rgba(20,26,34,0.5)"
          />
          <ellipse class="sid-mark-fl" cx="50" cy="48" rx="14" ry="26" fill="#e31e24" opacity="0.95" />
          <circle class="sid-mark-bc" cx="71" cy="61" r="3.2" fill="#e31e24" />
        </svg>
      }
    </span>
  `,
  styles: [
    `
      :host {
        display: block;
        height: var(--sid-mark-dim, 3.25rem);
        width: var(--sid-mark-dim, 3.25rem);
      }

      :host.sid-mark-variant-full {
        height: auto;
        width: auto;
        max-width: min(92vw, 280px);
      }

      .sid-mark-host {
        position: relative;
        display: block;
        height: 100%;
        width: 100%;
      }

      :host.sid-mark-variant-full .sid-mark-host {
        display: inline-block;
        height: auto;
        width: auto;
      }

      .sid-mark-aura {
        position: absolute;
        inset: -18%;
        border-radius: 18%;
        background: radial-gradient(
          closest-side,
          rgba(227, 30, 36, 0.42) 0%,
          rgba(227, 30, 36, 0.08) 55%,
          transparent 72%
        );
        animation: sidepRasterAura 3.3s ease-in-out infinite;
        pointer-events: none;
        z-index: 0;
      }

      :host.sid-mark-variant-full .sid-mark-aura {
        inset: -10%;
      }

      .sid-mark-img {
        position: relative;
        z-index: 1;
        display: block;
        height: 100%;
        width: 100%;
        object-fit: contain;
        mix-blend-mode: normal;
        filter: drop-shadow(0 2px 10px rgba(227, 30, 36, 0.35));
        transform-origin: 50% 55%;
        animation:
          sidepRasterBreathe 2.85s ease-in-out infinite alternate,
          sidepRasterShine 5s ease-in-out infinite;
      }

      :host.sid-mark-variant-full .sid-mark-img {
        height: auto;
        width: auto;
        max-width: 100%;
        max-height: var(--sid-mark-dim, 200px);
        object-fit: contain;
      }

      .sid-mark-svg-fallback {
        position: relative;
        z-index: 1;
        display: block;
        height: 100%;
        width: 100%;
      }

      .sid-mark-fl-bg {
        animation: sidepFallbackPulse 2.2s ease-in-out infinite alternate;
      }
      .sid-mark-fl {
        transform-origin: 50px 55px;
        animation: sidepFallbackPulse 1.85s ease-in-out infinite alternate;
      }
      .sid-mark-bc {
        animation: sidepFallbackBeacon 0.95s ease-in-out infinite alternate;
      }

      @keyframes sidepRasterAura {
        0%,
        100% {
          opacity: 0.45;
          transform: scale(0.92);
        }
        50% {
          opacity: 1;
          transform: scale(1.06);
        }
      }

      @keyframes sidepRasterBreathe {
        0% {
          transform: scale(1) translateY(0);
        }
        100% {
          transform: scale(1.065) translateY(-1px);
        }
      }

      @keyframes sidepRasterShine {
        0%,
        100% {
          filter: drop-shadow(0 2px 10px rgba(227, 30, 36, 0.32))
            brightness(1) contrast(1.02);
        }
        35% {
          filter: drop-shadow(0 0 16px rgba(250, 80, 80, 0.55))
            brightness(1.12) contrast(1.06);
        }
        65% {
          filter: drop-shadow(0 2px 14px rgba(227, 30, 36, 0.45))
            brightness(1.05) contrast(1.04);
        }
      }

      @keyframes sidepFallbackPulse {
        from {
          filter: brightness(0.92);
          transform: scale(1);
        }
        to {
          filter: brightness(1.08);
          transform: scale(1.04);
        }
      }

      @keyframes sidepFallbackBeacon {
        from {
          opacity: 0.55;
        }
        to {
          opacity: 1;
          filter: drop-shadow(0 0 5px rgba(227, 30, 36, 0.9));
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .sid-mark-aura,
        .sid-mark-img,
        .sid-mark-fl-bg,
        .sid-mark-fl,
        .sid-mark-bc {
          animation: none !important;
        }
        .sid-mark-img {
          transform: none;
          filter: drop-shadow(0 2px 8px rgba(227, 30, 36, 0.25));
        }
      }

      :host-context(body.motion-suave) .sid-mark-aura {
        animation-duration: 10s !important;
      }
      :host-context(body.motion-suave) .sid-mark-img {
        animation-duration: 6s, 12s !important;
      }
    `,
  ],
})
export class SidepBrandMarkComponent {
  readonly dim = input<string>('3.25rem');
  readonly variant = input<SidepBrandMarkVariant>('mark');

  readonly logoSrc = computed(() => {
    const rel = this.variant() === 'full' ? SIDEP_FULL_LOGO_PNG : SIDEP_MARK_PNG;
    try {
      return new URL(rel, document.baseURI).href;
    } catch {
      return `/${rel}`;
    }
  });

  readonly useFallback = signal(false);

  onImgError(): void {
    this.useFallback.set(true);
  }
}
