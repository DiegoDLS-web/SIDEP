import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SidepIconsModule } from './sidep-icons.module';

/** Banner visible mientras se edita la plantilla base (no el registro de inspección). */
@Component({
  selector: 'app-sid-plantilla-edicion-banner',
  standalone: true,
  imports: [CommonModule, SidepIconsModule],
  template: `
    @if (visible) {
      <div
        class="sid-feedback mb-4 flex items-start gap-3 rounded-xl border border-cyan-500/45 bg-cyan-950/35 px-4 py-3 text-sm text-cyan-50"
        role="status"
        aria-live="polite"
      >
        <lucide-icon name="pencil" class="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" [size]="20" color="currentColor" />
        <div class="min-w-0">
          <p class="font-semibold text-cyan-100">Edición de plantilla activa</p>
          <p class="mt-0.5 text-xs leading-relaxed text-cyan-200/85">{{ mensaje }}</p>
        </div>
      </div>
    }
  `,
})
export class SidPlantillaEdicionBannerComponent {
  @Input({ required: true }) visible = false;
  @Input() mensaje =
    'Estás modificando la plantilla base. Inspector, OBAC, firmas y cantidades actuales no aplican hasta guardar la plantilla.';
}
