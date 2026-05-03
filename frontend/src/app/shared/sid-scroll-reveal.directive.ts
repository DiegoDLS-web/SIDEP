import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

/**
 * Al entrar en vista al hacer scroll, quita la clase oculta y anima opacidad / traslado.
 * Respeta `prefers-reduced-motion`: muestra el bloque sin animación.
 */
@Directive({
  selector: '[sidScrollReveal]',
  standalone: true,
})
export class SidScrollRevealDirective implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private observer: IntersectionObserver | null = null;

  private static readonly reduceMotion =
    typeof globalThis !== 'undefined' &&
    typeof globalThis.matchMedia === 'function' &&
    globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;

  ngOnInit(): void {
    const native = this.el.nativeElement;
    native.classList.add('sid-scroll-reveal');

    if (SidScrollRevealDirective.reduceMotion) {
      native.classList.add('sid-scroll-reveal--visible');
      return;
    }

    native.classList.add('sid-scroll-reveal--hidden');

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const t = entry.target as HTMLElement;
          t.classList.remove('sid-scroll-reveal--hidden');
          t.classList.add('sid-scroll-reveal--visible');
          this.observer?.unobserve(t);
        }
      },
      { threshold: 0.06, rootMargin: '0px 0px -32px 0px' },
    );
    this.observer.observe(native);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
