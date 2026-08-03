import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

/** Firma manuscrita (PNG base64 data URL). Fondo negro y trazo claro. */
@Component({
  selector: 'app-signature-pad',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-2">
      <div #wrap class="w-full max-w-full" [class.sid-signature-wrap]="responsive">
        <canvas
          #cv
          [attr.width]="effectiveWidth"
          [attr.height]="effectiveHeight"
          class="block w-full max-w-full touch-none rounded-lg border border-neutral-700 bg-black"
          [attr.aria-label]="ariaLabel"
          role="img"
          (pointerdown)="onDown($event)"
          (pointermove)="onMove($event)"
          (pointerup)="onUp($event)"
          (pointercancel)="onUp($event)"
        ></canvas>
      </div>
      <button
        type="button"
        class="text-sm text-amber-400/90 hover:text-amber-300"
        aria-label="Limpiar firma"
        (click)="limpiar()"
      >
        Limpiar firma
      </button>
    </div>
  `,
})
export class SignaturePadComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() value = '';
  @Input() canvasWidth = 400;
  @Input() canvasHeight = 120;
  @Input() dark = false;
  /** Ajusta resolución interna al ancho del contenedor (móvil). */
  @Input() responsive = false;
  @Input() ariaLabel = 'Área de firma manuscrita';

  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('cv') canvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('wrap') wrapRef?: ElementRef<HTMLDivElement>;

  effectiveWidth = 400;
  effectiveHeight = 120;

  private dibujando = false;
  private lastX = 0;
  private lastY = 0;
  private ro?: ResizeObserver;

  ngAfterViewInit(): void {
    this.syncDimensions();
    if (this.responsive && this.wrapRef?.nativeElement) {
      this.ro = new ResizeObserver(() => this.syncDimensions());
      this.ro.observe(this.wrapRef.nativeElement);
    }
    this.pintarFondoNegro();
    if (this.value.startsWith('data:image')) {
      queueMicrotask(() => this.pintarDesdeDataUrl(this.value));
    }
  }

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['canvasWidth'] || ch['canvasHeight']) {
      this.syncDimensions();
    }
    if (!ch['value'] || !this.canvasRef) return;
    queueMicrotask(() => {
      if (this.value.startsWith('data:image')) {
        this.pintarDesdeDataUrl(this.value);
      } else {
        this.pintarFondoNegro();
      }
    });
  }

  ngOnDestroy(): void {
    this.ro?.disconnect();
  }

  private syncDimensions(): void {
    if (this.responsive && this.wrapRef?.nativeElement) {
      const w = Math.floor(this.wrapRef.nativeElement.clientWidth) || this.canvasWidth;
      this.effectiveWidth = Math.max(260, Math.min(w, 720));
      const ratio = this.canvasHeight / this.canvasWidth;
      this.effectiveHeight = Math.max(90, Math.round(this.effectiveWidth * ratio));
    } else {
      this.effectiveWidth = this.canvasWidth;
      this.effectiveHeight = this.canvasHeight;
    }
  }

  private ctx(): CanvasRenderingContext2D | null {
    return this.canvasRef?.nativeElement?.getContext('2d') ?? null;
  }

  private pintarFondoNegro(): void {
    const canvas = this.canvasRef?.nativeElement;
    const ctx = this.ctx();
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  private pintarDesdeDataUrl(url: string): void {
    const canvas = this.canvasRef?.nativeElement;
    const ctx = this.ctx();
    if (!canvas || !ctx) return;
    const img = new Image();
    img.onload = () => {
      this.pintarFondoNegro();
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = url;
  }

  onDown(ev: PointerEvent): void {
    ev.preventDefault();
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    canvas.setPointerCapture(ev.pointerId);
    const ctx = this.ctx();
    if (!ctx) return;
    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    this.dibujando = true;
    const r = canvas.getBoundingClientRect();
    const scaleX = canvas.width / r.width;
    const scaleY = canvas.height / r.height;
    this.lastX = (ev.clientX - r.left) * scaleX;
    this.lastY = (ev.clientY - r.top) * scaleY;
  }

  onMove(ev: PointerEvent): void {
    if (!this.dibujando) return;
    ev.preventDefault();
    const canvas = this.canvasRef?.nativeElement;
    const ctx = this.ctx();
    if (!canvas || !ctx) return;
    const r = canvas.getBoundingClientRect();
    const scaleX = canvas.width / r.width;
    const scaleY = canvas.height / r.height;
    const x = (ev.clientX - r.left) * scaleX;
    const y = (ev.clientY - r.top) * scaleY;
    ctx.beginPath();
    ctx.moveTo(this.lastX, this.lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    this.lastX = x;
    this.lastY = y;
  }

  onUp(ev: PointerEvent): void {
    if (!this.dibujando) return;
    ev.preventDefault();
    this.dibujando = false;
    const canvas = this.canvasRef?.nativeElement;
    try {
      canvas?.releasePointerCapture(ev.pointerId);
    } catch {
      /* ignore */
    }
    if (canvas) {
      this.valueChange.emit(canvas.toDataURL('image/png'));
    }
  }

  limpiar(): void {
    this.pintarFondoNegro();
    this.valueChange.emit('');
  }
}
