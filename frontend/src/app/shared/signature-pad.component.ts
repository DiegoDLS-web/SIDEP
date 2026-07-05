import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
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
      <canvas
        #cv
        [attr.width]="canvasWidth"
        [attr.height]="canvasHeight"
        class="block w-full max-w-3xl touch-none rounded-lg border border-neutral-700 bg-black"
        (pointerdown)="onDown($event)"
        (pointermove)="onMove($event)"
        (pointerup)="onUp($event)"
        (pointercancel)="onUp($event)"
      ></canvas>
      <button
        type="button"
        class="text-sm text-amber-400/90 hover:text-amber-300"
        (click)="limpiar()"
      >
        Limpiar firma
      </button>
    </div>
  `,
})
export class SignaturePadComponent implements AfterViewInit, OnChanges {
  @Input() value = '';

  /** Ancho interno del canvas (px). */
  @Input() canvasWidth = 400;

  /** Alto interno del canvas (px). */
  @Input() canvasHeight = 120;

  /** Conservado por compatibilidad; el estilo es siempre fondo negro. */
  @Input() dark = false;

  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('cv') canvasRef?: ElementRef<HTMLCanvasElement>;

  private dibujando = false;
  private lastX = 0;
  private lastY = 0;

  ngAfterViewInit(): void {
    this.pintarFondoNegro();
    if (this.value.startsWith('data:image')) {
      queueMicrotask(() => this.pintarDesdeDataUrl(this.value));
    }
  }

  ngOnChanges(ch: SimpleChanges): void {
    if (!ch['value'] || !this.canvasRef) return;
    queueMicrotask(() => {
      if (this.value.startsWith('data:image')) {
        this.pintarDesdeDataUrl(this.value);
      } else {
        this.pintarFondoNegro();
      }
    });
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
    if (!canvas || !ctx) {
      return;
    }
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
    if (!canvas) {
      return;
    }
    canvas.setPointerCapture(ev.pointerId);
    const ctx = this.ctx();
    if (!ctx) {
      return;
    }
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
    if (!this.dibujando) {
      return;
    }
    ev.preventDefault();
    const canvas = this.canvasRef?.nativeElement;
    const ctx = this.ctx();
    if (!canvas || !ctx) {
      return;
    }
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
    if (!this.dibujando) {
      return;
    }
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
