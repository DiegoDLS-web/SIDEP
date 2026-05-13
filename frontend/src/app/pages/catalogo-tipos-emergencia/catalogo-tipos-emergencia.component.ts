import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { TipoEmergenciaItemDto } from '../../models/configuracion.dto';
import { CatalogoTiposEmergenciaService } from '../../services/catalogo-tipos-emergencia.service';
import { ConfiguracionesService } from '../../services/configuraciones.service';
import { ToastService } from '../../services/toast.service';
import { mensajeApiError } from '../../utils/api-error.util';
import { CLAVES_NUEVO_PARTE } from '../partes/partes.constants';
import { SidScrollRevealDirective } from '../../shared/sid-scroll-reveal.directive';
import { SidepIconsModule } from '../../shared/sidep-icons.module';

@Component({
  selector: 'app-catalogo-tipos-emergencia',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule, SidScrollRevealDirective],
  templateUrl: './catalogo-tipos-emergencia.component.html',
})
export class CatalogoTiposEmergenciaComponent implements OnInit {
  private readonly configApi = inject(ConfiguracionesService);
  readonly catalogoSvc = inject(CatalogoTiposEmergenciaService);
  private readonly toast = inject(ToastService);

  filas: TipoEmergenciaItemDto[] = [];
  loading = true;
  guardando = false;
  error: string | null = null;
  exito: string | null = null;

  ngOnInit(): void {
    this.configApi.obtener().subscribe({
      next: (cfg) => {
        if (cfg.tiposEmergencia && cfg.tiposEmergencia.length > 0) {
          this.filas = cfg.tiposEmergencia.map((t) => ({
            value: t.value,
            label: t.label,
          }));
        } else {
          this.filas = CLAVES_NUEVO_PARTE.map((c) => ({ value: c.value, label: c.label }));
        }
        this.loading = false;
      },
      error: () => {
        this.filas = CLAVES_NUEVO_PARTE.map((c) => ({ value: c.value, label: c.label }));
        this.loading = false;
        this.error = 'No se pudo cargar la configuración; mostrando lista por defecto.';
      },
    });
  }

  agregarFila(): void {
    this.filas.push({ value: '', label: '' });
  }

  quitarFila(index: number): void {
    this.filas.splice(index, 1);
  }

  guardar(): void {
    this.exito = null;
    this.error = null;
    const normalizados: TipoEmergenciaItemDto[] = [];
    const seen = new Set<string>();
    for (const f of this.filas) {
      const value = f.value.trim();
      const label = f.label.trim();
      if (!value || !label) continue;
      if (seen.has(value)) continue;
      seen.add(value);
      normalizados.push({ value, label });
    }
    if (normalizados.length === 0) {
      this.error = 'Debe existir al menos un tipo con código y descripción.';
      return;
    }
    this.guardando = true;
    this.configApi.guardarTiposEmergencia(normalizados).subscribe({
      next: () => {
        this.guardando = false;
        this.exito = 'Catálogo guardado. Los partes usarán estos tipos en adelante.';
        this.toast.exito('Tipos de emergencia actualizados.');
        this.catalogoSvc.reload();
      },
      error: (err) => {
        this.guardando = false;
        const msg = mensajeApiError(
          err,
          'No se pudo guardar. El código solo puede usar letras, números, guiones y puntos.',
        );
        this.error = msg;
        this.toast.error(msg);
      },
    });
  }
}
