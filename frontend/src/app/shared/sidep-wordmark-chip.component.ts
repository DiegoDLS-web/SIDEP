import { Component, input } from '@angular/core';

/**
 * Marca SIDEP solo tipográfica (sin hexágono): chip compacto con “E” animada.
 * Para cabeceras de panel (p. ej. dashboard) donde no conviene repetir el mismo glifo.
 */
@Component({
  selector: 'app-sidep-wordmark-chip',
  standalone: true,
  host: {
    '[class.sid-wm-chip--md]': `size() === 'md'`,
    class: 'sid-wm-chip-host',
    role: 'img',
    '[attr.aria-label]': "'SIDEP'",
  },
  template: `
    <div class="sid-wm-chip">
      <svg viewBox="0 0 176 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <text x="0" y="34" class="sid-wm-letter">S</text>
        <text x="22" y="34" class="sid-wm-letter">I</text>
        <text x="34" y="34" class="sid-wm-letter">D</text>
        <rect class="sid-wm-ebar" x="54" y="9" width="40" height="6.5" rx="2" fill="#f87171" />
        <rect class="sid-wm-ebar sid-wm-ebar--2" x="54" y="20" width="40" height="6.5" rx="2" fill="#ef4444" />
        <rect class="sid-wm-ebar sid-wm-ebar--3" x="54" y="31" width="40" height="6.5" rx="2" fill="#dc2626" />
        <text x="102" y="34" class="sid-wm-letter">P</text>
      </svg>
    </div>
  `,
  styles: `
    :host {
      display: inline-flex;
      vertical-align: middle;
      line-height: 0;
    }
    .sid-wm-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.2rem 0.5rem 0.25rem;
      border-radius: 0.7rem;
      background: linear-gradient(155deg, rgba(30, 41, 59, 0.88), rgba(8, 12, 20, 0.96));
      border: 1px solid rgba(148, 163, 184, 0.22);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.07),
        0 0 0 1px rgba(0, 0, 0, 0.35),
        0 6px 20px rgba(0, 0, 0, 0.35);
    }
    svg {
      width: auto;
      height: 1.45rem;
      display: block;
    }
    :host(.sid-wm-chip--md) svg {
      height: 1.65rem;
    }
    .sid-wm-letter {
      font-family: ui-sans-serif, system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 26px;
      font-weight: 800;
      fill: #f8fafc;
      letter-spacing: -0.07em;
    }
    .sid-wm-ebar {
      transform-origin: 74px 23px;
      animation: sidWmEbar 2.6s cubic-bezier(0.45, 0, 0.55, 1) infinite;
    }
    .sid-wm-ebar--2 {
      animation-delay: 0.12s;
    }
    .sid-wm-ebar--3 {
      animation-delay: 0.24s;
    }
    @keyframes sidWmEbar {
      0%,
      100% {
        transform: scaleX(0.88) translateX(0);
        opacity: 0.78;
        filter: brightness(0.92);
      }
      35% {
        transform: scaleX(1.02) translateX(1px);
        opacity: 1;
        filter: brightness(1.12) drop-shadow(0 0 8px rgba(248, 113, 113, 0.65));
      }
      65% {
        transform: scaleX(0.96) translateX(-0.5px);
        opacity: 0.92;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .sid-wm-ebar {
        animation: none !important;
      }
    }
    :host-context(body.motion-suave) .sid-wm-ebar {
      animation-duration: 4.5s !important;
    }
  `,
})
export class SidepWordmarkChipComponent {
  readonly size = input<'sm' | 'md'>('sm');
}
