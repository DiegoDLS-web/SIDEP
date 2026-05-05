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

/** Firma manuscrita (PNG base64 data URL). */
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
        class="block w-full max-w-3xl touch-none rounded-lg border"
        [ngClass]="
          dark
            ? 'border-gray-600 bg-[#1a1a1a]'
            : 'border-gray-500 bg-[#f3f4f6]'
        "
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

  /** Fondo oscuro y trazo claro (útil en pantallas dark mode). */
  @Input() dark = false;

  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('cv') canvasRef?: ElementRef<HTMLCanvasElement>;

  private dibujando = false;
  private lastX = 0;
  private lastY = 0;

  ngAfterViewInit(): void {
    if (this.value.startsWith('data:image')) {
      queueMicrotask(() => this.pintarDesdeDataUrl(this.value));
    }
  }

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['value'] && this.value.startsWith('data:image') && this.canvasRef) {
      queueMicrotask(() => this.pintarDesdeDataUrl(this.value));
    }
  }

  private ctx(): CanvasRenderingContext2D | null {
    return this.canvasRef?.nativeElement?.getContext('2d') ?? null;
  }

  private pintarDesdeDataUrl(url: string): void {
    const canvas = this.canvasRef?.nativeElement;
    const ctx = this.ctx();
    if (!canvas || !ctx) {
      return;
    }
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    ctx.strokeStyle = this.dark ? '#f5f5f5' : '#111';
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
    const canvas = this.canvasRef?.nativeElement;
    const ctx = this.ctx();
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    this.valueChange.emit('');
  }
}
