import { Component, input } from '@angular/core';

/** Wordmark “SIDEP” para fondos oscuros: texto claro + E animada en tres barras rojas */
@Component({
  selector: 'app-sidep-wordmark-dark',
  standalone: true,
  host: {
    '[class.sid-wordmark-dark--compact]': `size() === 'compact'`,
    '[class.sid-wordmark-dark--hero]': `size() === 'hero'`,
    role: 'img',
    '[attr.aria-label]': "'SIDEP'",
    class: 'sid-wordmark-dark',
  },
  template: `
    <svg viewBox="0 0 300 62" xmlns="http://www.w3.org/2000/svg" fill="none" class="sid-wordmark-dark__svg" aria-hidden="true" focusable="false">
      <text x="6" y="46" fill="#f1f5f9" class="sid-wordmark-dark__glyph">S</text>
      <text x="62" y="46" fill="#f1f5f9" class="sid-wordmark-dark__glyph">I</text>
      <text x="88" y="46" fill="#f1f5f9" class="sid-wordmark-dark__glyph">D</text>
      <rect class="sid-wordmark-dark__bar" x="134" y="12" width="52" height="8" rx="2" fill="#ef4444" />
      <rect class="sid-wordmark-dark__bar sid-wordmark-dark__bar--2" x="134" y="26" width="52" height="8" rx="2" fill="#ef4444" />
      <rect class="sid-wordmark-dark__bar sid-wordmark-dark__bar--3" x="134" y="40" width="52" height="8" rx="2" fill="#ef4444" />
      <text x="204" y="46" fill="#f1f5f9" class="sid-wordmark-dark__glyph">P</text>
    </svg>
  `,
  styles: `
    :host {
      display: block;
      line-height: 0;
      filter: drop-shadow(0 0 20px rgba(220, 38, 38, 0.18));
    }
    .sid-wordmark-dark__svg {
      width: auto;
      display: block;
    }
    :host(.sid-wordmark-dark--compact) .sid-wordmark-dark__svg {
      height: 1.05rem;
      max-width: min(172px, 100%);
    }
    :host(.sid-wordmark-dark--hero) .sid-wordmark-dark__svg {
      height: 2.125rem;
      max-width: min(300px, 92vw);
    }
    .sid-wordmark-dark__glyph {
      font-family: system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 40px;
      font-weight: 800;
      letter-spacing: -0.04em;
    }
    .sid-wordmark-dark__bar {
      transform-origin: 134px 50%;
      animation: sidWmBar 2.85s ease-in-out infinite;
    }
    .sid-wordmark-dark__bar--2 {
      animation-delay: 0.2s;
    }
    .sid-wordmark-dark__bar--3 {
      animation-delay: 0.4s;
    }
    @keyframes sidWmBar {
      0%,
      100% {
        transform: scaleX(0.94);
        opacity: 0.88;
      }
      45% {
        transform: scaleX(1);
        opacity: 1;
        filter: drop-shadow(0 0 10px rgba(248, 113, 113, 0.65));
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .sid-wordmark-dark__bar {
        animation: none;
        opacity: 1;
        transform: none;
        filter: none;
      }
    }
    :host-context(body.motion-suave) .sid-wordmark-dark__bar {
      animation-duration: 8s !important;
    }
  `,
})
export class SidepWordmarkDarkComponent {
  /** Barra lateral (compacto) o bloque hero del login */
  readonly size = input<'compact' | 'hero'>('compact');
}
