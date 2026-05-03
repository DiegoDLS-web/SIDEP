import { Component, input } from '@angular/core';

/**
 * Lockup SIDEP: emblema vectorial (sin PNG con fondo blanco) + wordmark compacto
 * y animación en la “E”. Pensado para sidebar y login en tema oscuro.
 */
@Component({
  selector: 'app-sidep-brand-lockup',
  standalone: true,
  host: {
    '[class.sid-lockup--hero]': `variant() === 'hero'`,
    '[class.sid-lockup--sidebar]': `variant() === 'sidebar'`,
    role: 'group',
    '[attr.aria-label]': "'SIDEP'",
    class: 'sid-brand-lockup',
  },
  template: `
    <div class="sid-lockup-shell">
      <div class="sid-lockup-glow" aria-hidden="true"></div>
      <div class="sid-lockup-inner">
        <svg class="sid-lockup-mark" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <path
            class="sid-lockup-hex"
            d="M50 6 L86 28 L86 72 L50 94 L14 72 L14 28 Z"
            fill="rgba(8,12,20,0.92)"
            stroke="#64748b"
            stroke-width="1.8"
            stroke-linejoin="round"
          />
          <path
            class="sid-lockup-flame"
            d="M50 20 C56 28 58 36 50 48 C42 36 44 28 50 20"
            fill="#ef4444"
          />
          <rect x="30" y="50" width="40" height="26" rx="3" fill="#1e293b" stroke="#334155" stroke-width="1" />
          <rect x="34" y="54" width="6" height="6" rx="1" fill="#ef4444" opacity="0.95" />
          <rect x="34" y="64" width="6" height="6" rx="1" fill="#ef4444" opacity="0.85" />
          <rect x="34" y="74" width="6" height="6" rx="1" fill="#ef4444" opacity="0.75" />
          <rect x="44" y="56" width="22" height="2.5" rx="0.5" fill="#475569" />
          <rect x="44" y="62" width="18" height="2.5" rx="0.5" fill="#475569" />
          <rect x="44" y="68" width="20" height="2.5" rx="0.5" fill="#475569" />
          <path
            class="sid-lockup-truck"
            d="M58 78 L78 78 L82 72 L82 68 L72 68 L68 72 L58 72 Z"
            fill="#0f172a"
            stroke="#334155"
            stroke-width="0.8"
          />
          <rect x="74" y="66" width="5" height="2" rx="0.5" fill="#ef4444" class="sid-lockup-beacon" />
        </svg>
        <svg class="sid-lockup-type" viewBox="0 0 210 52" aria-hidden="true" focusable="false">
          <text x="0" y="38" class="sid-lockup-letter">S</text>
          <text x="26" y="38" class="sid-lockup-letter">I</text>
          <text x="40" y="38" class="sid-lockup-letter">D</text>
          <rect class="sid-lockup-ebar" x="66" y="10" width="44" height="7" rx="2" fill="#f87171" />
          <rect class="sid-lockup-ebar sid-lockup-ebar--2" x="66" y="22" width="44" height="7" rx="2" fill="#ef4444" />
          <rect class="sid-lockup-ebar sid-lockup-ebar--3" x="66" y="34" width="44" height="7" rx="2" fill="#dc2626" />
          <text x="122" y="38" class="sid-lockup-letter">P</text>
        </svg>
      </div>
      @if (subline()) {
        <p class="sid-lockup-sub">{{ subline() }}</p>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      max-width: 100%;
    }
    .sid-lockup-shell {
      position: relative;
      border-radius: 1rem;
      padding: 1px;
      background: linear-gradient(
        125deg,
        rgba(239, 68, 68, 0.38),
        rgba(99, 102, 241, 0.22),
        rgba(239, 68, 68, 0.34)
      );
      background-size: 220% 220%;
      animation: sidLkBorderFlow 12s ease-in-out infinite;
    }
    :host(.sid-lockup--hero) .sid-lockup-shell {
      border-radius: 1.35rem;
      animation-duration: 15s;
    }
    @keyframes sidLkBorderFlow {
      0%,
      100% {
        background-position: 8% 45%;
      }
      50% {
        background-position: 92% 55%;
      }
    }
    .sid-lockup-glow {
      pointer-events: none;
      position: absolute;
      inset: -16%;
      border-radius: 1.25rem;
      background: radial-gradient(closest-side, rgba(239, 68, 68, 0.26), transparent 68%);
      opacity: 0.9;
      animation: sidLkGlowPulse 3.8s ease-in-out infinite;
      z-index: 0;
    }
    @keyframes sidLkGlowPulse {
      0%,
      100% {
        transform: scale(0.96);
        opacity: 0.55;
      }
      50% {
        transform: scale(1.04);
        opacity: 0.95;
      }
    }
    .sid-lockup-inner {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      gap: 0.45rem;
      border-radius: calc(1rem - 1px);
      background: linear-gradient(165deg, rgba(15, 23, 42, 0.92), rgba(3, 7, 18, 0.96));
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.06),
        0 12px 40px rgba(0, 0, 0, 0.45);
      padding: 0.35rem 0.5rem 0.35rem 0.4rem;
    }
    :host(.sid-lockup--hero) .sid-lockup-inner {
      border-radius: calc(1.35rem - 1px);
      padding: 0.55rem 0.85rem 0.55rem 0.65rem;
      gap: 0.65rem;
    }
    .sid-lockup-mark {
      flex-shrink: 0;
      width: 2.35rem;
      height: 2.35rem;
      display: block;
      filter: drop-shadow(0 0 12px rgba(239, 68, 68, 0.28));
    }
    :host(.sid-lockup--hero) .sid-lockup-mark {
      width: clamp(4.25rem, 16vw, 5.75rem);
      height: clamp(4.25rem, 16vw, 5.75rem);
    }
    .sid-lockup-flame {
      transform-origin: 50px 34px;
      animation: sidLkFlame 2.5s ease-in-out infinite alternate;
      filter: drop-shadow(0 0 8px rgba(248, 113, 113, 0.55));
    }
    @keyframes sidLkFlame {
      from {
        transform: scale(0.95) translateY(0.5px);
        opacity: 0.9;
      }
      to {
        transform: scale(1.07) translateY(-1px);
        opacity: 1;
      }
    }
    .sid-lockup-beacon {
      transform-origin: 76.5px 67px;
      animation: sidLkBeacon 0.95s steps(2, end) infinite;
    }
    @keyframes sidLkBeacon {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.22;
      }
    }
    .sid-lockup-type {
      flex: 1 1 auto;
      min-width: 0;
      height: 1.85rem;
      display: block;
    }
    :host(.sid-lockup--hero) .sid-lockup-type {
      height: clamp(2.15rem, 6vw, 2.65rem);
    }
    .sid-lockup-letter {
      font-family: ui-sans-serif, system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 30px;
      font-weight: 800;
      fill: #f8fafc;
      letter-spacing: -0.06em;
    }
    :host(.sid-lockup--hero) .sid-lockup-letter {
      font-size: 34px;
    }
    .sid-lockup-ebar {
      transform-origin: 88px 50%;
      animation: sidLkEbar 2.9s cubic-bezier(0.45, 0, 0.55, 1) infinite;
    }
    .sid-lockup-ebar--2 {
      animation-delay: 0.14s;
    }
    .sid-lockup-ebar--3 {
      animation-delay: 0.28s;
    }
    @keyframes sidLkEbar {
      0%,
      100% {
        transform: scaleX(0.88) translateX(0);
        opacity: 0.78;
        filter: brightness(0.95);
      }
      38% {
        transform: scaleX(1.05) translateX(2px);
        opacity: 1;
        filter: brightness(1.12) drop-shadow(0 0 10px rgba(248, 113, 113, 0.72));
      }
      68% {
        transform: scaleX(0.96) translateX(-1px);
        opacity: 0.9;
      }
    }
    .sid-lockup-sub {
      margin: 0.45rem 0 0;
      padding: 0 0.15rem;
      font-size: 0.7rem;
      font-weight: 500;
      letter-spacing: 0.06em;
      color: #94a3b8;
      text-align: left;
      line-height: 1.25;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    :host(.sid-lockup--hero) .sid-lockup-sub {
      text-align: center;
      font-size: 0.9rem;
      margin-top: 0.65rem;
      color: #cbd5e1;
    }
    @media (prefers-reduced-motion: reduce) {
      .sid-lockup-shell,
      .sid-lockup-glow,
      .sid-lockup-flame,
      .sid-lockup-beacon,
      .sid-lockup-ebar {
        animation: none !important;
      }
      .sid-lockup-shell {
        background: linear-gradient(120deg, rgba(239, 68, 68, 0.35), rgba(71, 85, 105, 0.4));
      }
    }
    :host-context(body.motion-suave) .sid-lockup-shell {
      animation-duration: 22s !important;
    }
    :host-context(body.motion-suave) .sid-lockup-ebar {
      animation-duration: 5s !important;
    }
    :host-context(body.motion-suave) .sid-lockup-flame {
      animation-duration: 4.2s !important;
    }
    :host-context(body.motion-suave) .sid-lockup-beacon {
      animation-duration: 1.45s !important;
    }
  `,
})
export class SidepBrandLockupComponent {
  /** Sidebar estrecho vs bloque hero en login */
  readonly variant = input<'sidebar' | 'hero'>('sidebar');
  /** Línea opcional bajo el lockup (ej. nombre compañía) */
  readonly subline = input<string | null>(null);
}
