import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import type { AuditoriaUsuarioFilaDto } from '../../models/auditoria.dto';
import type { UsuariosMetricasDto } from '../../models/usuario.dto';
import { AuditoriaService } from '../../services/auditoria.service';
import { SidepIconsModule } from '../../shared/sidep-icons.module';

@Component({
  selector: 'app-auditoria-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, SidepIconsModule],
  templateUrl: './auditoria-usuarios.component.html',
})
export class AuditoriaUsuariosComponent implements OnInit {
  private readonly auditoria = inject(AuditoriaService);

  loading = true;
  error: string | null = null;
  filas: AuditoriaUsuarioFilaDto[] = [];
  metricas: UsuariosMetricasDto | null = null;

  filtroEstado: '' | 'ok' | 'alerta' | 'error' = '';
  filtroUsuario = '';

  readonly estadosFiltro = [
    { value: '', label: 'Todos los estados' },
    { value: 'ok', label: '✅ Correcto' },
    { value: 'alerta', label: '⚠️ Alerta' },
    { value: 'error', label: '❌ Error' },
  ];

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.error = null;

    forkJoin({
      usuarios: this.auditoria.listarUsuariosAuditoria(1, 200, this.filtroUsuario),
      metricas: this.auditoria.obtenerMetricasUsuarios().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ usuarios, metricas }) => {
        this.metricas = metricas;
        this.filas = this.auditoria.auditarUsuarios(usuarios);
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar los usuarios para auditoría.';
        this.loading = false;
      },
    });
  }

  buscar(): void {
    this.cargar();
  }

  get filasFiltradas(): AuditoriaUsuarioFilaDto[] {
    return this.filas.filter((f) => {
      if (this.filtroEstado && f.estado !== this.filtroEstado) return false;
      return true;
    });
  }

  get pctFichasCompletas(): number {
    const total = this.filasFiltradas.length;
    if (total === 0) return 0;
    const ok = this.filasFiltradas.filter((f) => f.estado === 'ok').length;
    return Math.round((ok / total) * 100);
  }

  iconoEstado = (estado: AuditoriaUsuarioFilaDto['estado']) => this.auditoria.iconoEstado(estado);
  clasesEstado = (estado: AuditoriaUsuarioFilaDto['estado']) => this.auditoria.clasesChipEstado(estado);
}
