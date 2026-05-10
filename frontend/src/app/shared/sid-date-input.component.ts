import { CommonModule } from '@angular/common';
import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { SidepIconsModule } from './sidep-icons.module';

type PresetKey = 'lg' | 'sid' | 'filter' | 'sm' | 'none';

@Component({
  selector: 'app-sid-date-input',
  standalone: true,
  imports: [CommonModule, FormsModule, SidepIconsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SidDateInputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="relative w-full min-w-0">
      <input
        #inp
        type="date"
        [attr.name]="name || null"
        [attr.id]="inputId || null"
        [attr.lang]="lang || null"
        [attr.title]="title || null"
        [attr.aria-label]="ariaLabel || null"
        [attr.min]="min || null"
        [attr.max]="max || null"
        [disabled]="disabled"
        [value]="value"
        (input)="onInput($event)"
        (blur)="onBlurInput()"
        [class]="combinedClass"
        [style.color-scheme]="colorSchemeDark ? 'dark' : null"
      />
      <button
        type="button"
        [ngClass]="triggerClass"
        [disabled]="disabled"
        (click)="abrir(inp)"
        [attr.aria-label]="calendarAriaLabel ?? 'Abrir calendario'"
      >
        <lucide-icon name="calendar-days" class="h-4 w-4 text-white" [size]="16" color="currentColor" />
      </button>
    </div>
  `,
})
export class SidDateInputComponent implements ControlValueAccessor {
  /** Variantes base de padding / borde / icono compacto */
  @Input() preset: PresetKey = 'lg';
  @Input() inputClass = '';
  @Input() min: string | undefined;
  @Input() max: string | undefined;
  @Input() lang: string | undefined;
  @Input() name = '';
  @Input() inputId = '';
  @Input() title: string | undefined;
  @Input() ariaLabel: string | undefined;
  @Input() calendarAriaLabel: string | undefined;
  @Input() colorSchemeDark = true;
  /** Fila tipo filtro histórico: botón más chico */
  @Input() dense = false;

  value = '';
  disabled = false;
  private onWrite: (v: string) => void = () => {};
  private onTouchedFn: () => void = () => {};

  private readonly presetClass: Record<PresetKey, string> = {
    lg:
      'min-h-[48px] w-full rounded-xl border border-gray-700 bg-[#0a0a0a] px-4 py-3 pr-11 text-base text-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500',
    sid:
      'sid-input dark-date-input w-full min-h-[48px] rounded-xl border border-slate-700 bg-[#121212] px-4 py-3 pr-11 text-sm text-white focus:border-red-500 focus:outline-none',
    filter:
      'sid-history-filter dark-date-input w-full min-h-[36px] rounded-lg py-1.5 pr-10 text-xs text-white focus:border-red-500 focus:outline-none',
    sm: 'min-h-[44px] w-full rounded-lg border border-gray-600 bg-[#0a0a0a] px-2 py-2 pr-10 text-sm text-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500',
    none: '',
  };

  get combinedClass(): string {
    const b = this.preset === 'none' ? '' : (this.presetClass[this.preset] ?? '');
    return [b, this.inputClass].filter(Boolean).join(' ');
  }

  get triggerClass(): string {
    if (this.dense || this.preset === 'filter') {
      return 'sid-date-trigger absolute right-1.5 top-1/2 z-[1] -translate-y-1/2 rounded-md border border-gray-700 bg-[#151515] p-1 text-white hover:bg-[#1a1a1a] disabled:opacity-50';
    }
    return 'sid-date-trigger absolute right-2 top-1/2 z-[1] -translate-y-1/2 rounded-lg border border-gray-700 bg-[#151515] p-1.5 text-white hover:bg-[#1a1a1a] disabled:opacity-50';
  }

  writeValue(obj: unknown): void {
    this.value = obj == null || obj === '' ? '' : String(obj);
  }
  registerOnChange(fn: (v: string) => void): void {
    this.onWrite = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  onBlurInput(): void {
    this.onTouchedFn();
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.value = v;
    this.onWrite(v);
  }

  abrir(inp: HTMLInputElement): void {
    if (this.disabled) return;
    if (typeof inp.showPicker === 'function') {
      inp.showPicker();
    }
    inp.focus();
  }
}
