import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SidepIconsModule } from './sidep-icons.module';

@Component({
  selector: 'app-sid-edicion-pendiente-banner',
  standalone: true,
  imports: [CommonModule, SidepIconsModule],
  template: `
    @if (visible) {
      <div
        class="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100"
        role="status"
        aria-live="polite"
      >
        <lucide-icon name="alert-circle" class="h-4 w-4 shrink-0 text-amber-400" [size]="16" color="currentColor" />
        <span>Cambios sin guardar</span>
      </div>
    }
  `,
})
export class SidEdicionPendienteBannerComponent {
  @Input({ required: true }) visible = false;
}
