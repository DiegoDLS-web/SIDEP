import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ConfiguracionSistemaDto } from '../../models/configuracion.dto';
import type { RolUsuarioDto } from '../../models/rol.dto';
import { ConfiguracionesService } from '../../services/configuraciones.service';
import { RolesService } from '../../services/roles.service';
import { ToastService } from '../../services/toast.service';
import { SidepIconsModule } from '../../shared/sidep-icons.module';

@Component({
  selector: 'app-configuraciones',
  standalone: true,
  imports: [CommonModule, FormsModule, SidepIconsModule],
  templateUrl: './configuraciones.component.html',
})
export class ConfiguracionesComponent implements OnInit {
  private readonly configApi = inject(ConfiguracionesService);
  private readonly rolesApi = inject(RolesService);
  private readonly toast = inject(ToastService);

  loading = true;
  guardando = false;
  error: string | null = null;
  exito: string | null = null;
  roles: RolUsuarioDto[] = [];

  config: ConfiguracionSistemaDto = {
    compania: {
      nombreCompania: '',
      nombreBomba: '',
      direccion: '',
      telefono: '',
      emailInstitucional: '',
      fechaFundacion: '',
    },
    notificaciones: {
      alertasEmergencia: true,
      alertasInventario: true,
      recordatoriosChecklist: true,
      resumenDiarioEmail: false,
    },
    reportes: {
      formatoPredeterminado: 'PDF',
      incluirLogo: true,
      orientacionPdf: 'VERTICAL',
    },
  };

  ngOnInit(): void {
    this.cargarRoles();
    this.configApi.obtener().subscribe({
      next: (data) => {
        this.config = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar las configuraciones.';
        this.toast.error('No se pudieron cargar las configuraciones.');
        this.loading = false;
      },
    });
  }

  cargarRoles(): void {
    this.rolesApi.listar(false).subscribe({
      next: (data) => {
        this.roles = data;
      },
      error: () => {
        this.error = 'No se pudieron cargar los roles.';
        this.toast.error('No se pudieron cargar los roles.');
      },
    });
  }

  cambiarEstadoRol(rol: RolUsuarioDto): void {
    this.rolesApi.actualizar(rol.id, { activo: !rol.activo }).subscribe({
      next: () => {
        this.toast.exito(rol.activo ? 'Rol desactivado.' : 'Rol activado.');
        this.cargarRoles();
      },
      error: () => {
        this.error = 'No se pudo actualizar el rol.';
        this.toast.error('No se pudo actualizar el rol.');
      },
    });
  }

  guardar(): void {
    this.guardando = true;
    this.error = null;
    this.exito = null;
    this.configApi.guardar(this.config).subscribe({
      next: (data) => {
        this.config = data;
        this.guardando = false;
        this.exito = 'Configuraciones guardadas correctamente.';
        this.toast.exito('Configuraciones guardadas correctamente.');
      },
      error: () => {
        this.guardando = false;
        this.error = 'No se pudieron guardar los cambios.';
        this.toast.error('No se pudieron guardar los cambios.');
      },
    });
  }
}
