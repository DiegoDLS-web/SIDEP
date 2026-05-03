import { Component, input } from '@angular/core';

/** Marca SIDEP compacta (solo emblema) para títulos de panel, listas, etc. */
@Component({
  selector: 'app-sidep-mark-glyph',
  standalone: true,
  host: {
    '[class.sid-mark-glyph--md]': `size() === 'md'`,
    class: 'sid-mark-glyph',
    role: 'img',
    '[attr.aria-label]': "'Marca SIDEP'",
  },
  template: `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path
        d="M50 6 L86 28 L86 72 L50 94 L14 72 L14 28 Z"
        fill="rgba(8,12,20,0.95)"
        stroke="#64748b"
        stroke-width="1.8"
        stroke-linejoin="round"
      />
      <path
        class="sid-mark-glyph-flame"
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
        d="M58 78 L78 78 L82 72 L82 68 L72 68 L68 72 L58 72 Z"
        fill="#0f172a"
        stroke="#334155"
        stroke-width="0.8"
      />
      <rect x="74" y="66" width="5" height="2" rx="0.5" fill="#ef4444" class="sid-mark-glyph-beacon" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      vertical-align: middle;
      line-height: 0;
    }
    svg {
      width: 1.35rem;
      height: 1.35rem;
      display: block;
      filter: drop-shadow(0 0 5px rgba(239, 68, 68, 0.12));
    }
    :host(.sid-mark-glyph--md) svg {
      width: 1.5rem;
      height: 1.5rem;
    }
    .sid-mark-glyph-flame {
      transform-origin: 50px 34px;
      animation: sidMgFlame 4.5s ease-in-out infinite alternate;
      filter: drop-shadow(0 0 3px rgba(248, 113, 113, 0.28));
    }
    @keyframes sidMgFlame {
      from {
        opacity: 0.93;
        transform: scale(0.99);
      }
      to {
        opacity: 1;
        transform: scale(1.025);
      }
    }
    .sid-mark-glyph-beacon {
      animation: sidMgBeacon 2.2s ease-in-out infinite;
    }
    @keyframes sidMgBeacon {
      0%,
      100% {
        opacity: 0.88;
      }
      50% {
        opacity: 0.4;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .sid-mark-glyph-flame,
      .sid-mark-glyph-beacon {
        animation: none !important;
      }
    }
    :host-context(body.motion-suave) .sid-mark-glyph-flame {
      animation-duration: 7s !important;
    }
    :host-context(body.motion-suave) .sid-mark-glyph-beacon {
      animation-duration: 3.2s !important;
    }
  `,
})
export class SidepMarkGlyphComponent {
  readonly size = input<'sm' | 'md'>('sm');
}
