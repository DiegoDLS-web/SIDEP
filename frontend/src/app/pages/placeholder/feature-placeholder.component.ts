import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-feature-placeholder',
  imports: [CommonModule],
  template: `
    <div class="p-8">
      <h1 class="mb-2 text-3xl font-bold">{{ title }}</h1>
      <p class="max-w-2xl text-gray-400">
        Contenido pendiente: se portará desde el prototipo (Figma/React) en la siguiente iteración de este
        módulo.
      </p>
    </div>
  `,
})
export class FeaturePlaceholderComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private sub?: Subscription;

  title = 'Módulo';

  ngOnInit(): void {
    const apply = (data: Record<string, unknown>) => {
      const t = data['title'];
      this.title = typeof t === 'string' ? t : 'Módulo';
    };
    apply(this.route.snapshot.data as Record<string, unknown>);
    this.sub = this.route.data.subscribe((data) => apply(data as Record<string, unknown>));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
