import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { ConfiguracionSistemaDto, EmailLogDto, LogosPdfCabecera } from '../../models/configuracion.dto';
import type { RolUsuarioDto } from '../../models/rol.dto';
import { ConfiguracionesService } from '../../services/configuraciones.service';
import { RolesService } from '../../services/roles.service';
import { ToastService } from '../../services/toast.service';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { SidDateInputComponent } from '../../shared/sid-date-input.component';
import { OPCIONES_MENU_SIDEP, rutasMenuFallbackPorRol } from '../../layout/nav-menu-opciones';
import { crearControlEdicionPendiente } from '../../utils/edicion-pendiente.util';
import type { ComponenteConEdicionPendiente } from '../../guards/edicion-pendiente.guard';
import { registrarEdicionPendienteGlobal } from '../../utils/registrar-edicion-pendiente-global.util';
import { SidEdicionPendienteBannerComponent } from '../../shared/sid-edicion-pendiente-banner.component';

@Component({
  selector: 'app-configuraciones',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule, SidDateInputComponent, SidEdicionPendienteBannerComponent],
  templateUrl: './configuraciones.component.html',
})
export class ConfiguracionesComponent implements OnInit, ComponenteConEdicionPendiente {
  readonly opcionesLogosPdf: { value: LogosPdfCabecera; label: string }[] = [
    { value: 'AMBOS', label: 'SIDEP y compañía (como en partes)' },
    { value: 'SIDEP', label: 'Solo marca SIDEP' },
    { value: 'COMPANIA', label: 'Solo logo de compañía' },
    { value: 'NINGUNO', label: 'Sin logos' },
  ];

  private readonly configApi = inject(ConfiguracionesService);
  private readonly rolesApi = inject(RolesService);
  private readonly toast = inject(ToastService);

  readonly opcionesMenu = OPCIONES_MENU_SIDEP;

  loading = true;
  guardando = false;
  subiendoLogoCompania = false;
  probandoCorreo = false;
  cargandoLogsCorreo = false;
  error: string | null = null;
  exito: string | null = null;
  correoPrueba = '';
  logsCorreo: EmailLogDto[] = [];
  roles: RolUsuarioDto[] = [];
  readonly logoCompaniaPreview = signal<string | null>(null);
  archivoLogoCompania: File | null = null;

  private readonly controlEdicion = crearControlEdicionPendiente(() => ({
    config: this.config,
    logo: this.archivoLogoCompania?.name ?? null,
  }));

  constructor() {
    const destroyRef = inject(DestroyRef);
    registrarEdicionPendienteGlobal(destroyRef, () => this.tieneEdicionPendiente());
  }

  tieneEdicionPendiente(): boolean {
    if (this.loading || this.guardando) return false;
    return this.controlEdicion.tieneCambios();
  }

  configuracionTieneCambios(): boolean {
    return this.controlEdicion.tieneCambios();
  }

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
      logosPdf: 'AMBOS',
      orientacionPdf: 'VERTICAL',
    },
    navegacionPorRol: {},
  };

  ngOnInit(): void {
    this.cargarRoles();
    this.configApi.obtener().subscribe({
      next: (data) => {
        const logosPdfNormalizado = this.normalizarLogosPdf(data.reportes);
        this.config = {
          ...data,
          reportes: { ...data.reportes, logosPdf: logosPdfNormalizado },
          navegacionPorRol: data.navegacionPorRol ?? {},
        };
        this.loading = false;
        this.tryAsegurarNavegacion();
        void this.actualizarVistaPreviaLogoCompania();
        this.controlEdicion.marcarLimpio();
        this.cargarLogsCorreo();
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
        this.tryAsegurarNavegacion();
      },
      error: () => {
        this.error = 'No se pudieron cargar los roles.';
        this.toast.error('No se pudieron cargar los roles.');
      },
    });
  }

  onArchivoLogoCompaniaSeleccionado(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    this.archivoLogoCompania = f ?? null;
  }

  subirLogoCompania(): void {
    if (!this.archivoLogoCompania) {
      this.toast.error('Selecciona una imagen PNG o JPEG.');
      return;
    }
    this.subiendoLogoCompania = true;
    this.error = null;
    this.configApi.subirLogoCompania(this.archivoLogoCompania).subscribe({
      next: (r) => {
        this.subiendoLogoCompania = false;
        this.archivoLogoCompania = null;
        this.logoCompaniaPreview.set(`${r.path}?v=${Date.now()}`);
        this.toast.exito('Logo de compañía actualizado. Los PDF usarán este archivo.');
      },
      error: (err: { error?: { error?: string } }) => {
        this.subiendoLogoCompania = false;
        const msg = err?.error?.error ?? 'No se pudo subir el logo.';
        this.error = msg;
        this.toast.error(msg);
      },
    });
  }

  private async actualizarVistaPreviaLogoCompania(): Promise<void> {
    for (const p of ['/uploads/compania-logo.png', '/uploads/compania-logo.jpg']) {
      try {
        const ok = await fetch(p, { method: 'HEAD' }).then((r) => r.ok);
        if (ok) {
          this.logoCompaniaPreview.set(`${p}?v=${Date.now()}`);
          return;
        }
      } catch {
        /* ignore */
      }
    }
    this.logoCompaniaPreview.set(null);
  }

  private normalizarLogosPdf(reportes: ConfiguracionSistemaDto['reportes']): LogosPdfCabecera {
    const ext = reportes as { logosPdf?: LogosPdfCabecera; incluirLogo?: boolean };
    const v = ext.logosPdf;
    if (v === 'AMBOS' || v === 'SIDEP' || v === 'COMPANIA' || v === 'NINGUNO') {
      return v;
    }
    if (ext.incluirLogo === false) {
      return 'NINGUNO';
    }
    if (ext.incluirLogo === true) {
      return 'AMBOS';
    }
    return 'AMBOS';
  }

  private tryAsegurarNavegacion(): void {
    if (this.loading || !this.roles.length) return;
    this.asegurarNavegacionPorRol();
  }

  /** Garantiza filas por rol conocido desde API antes de editar matrices. */
  private asegurarNavegacionPorRol(): void {
    const nav = { ...(this.config.navegacionPorRol ?? {}) };
    const vol = nav['VOLUNTARIOS']?.filter(Boolean);
    if (!vol?.length) {
      nav['VOLUNTARIOS'] = rutasMenuFallbackPorRol('VOLUNTARIOS');
    }
    for (const r of this.roles) {
      const k = r.nombre.trim().toUpperCase();
      if (!nav[k]?.length) {
        nav[k] = rutasMenuFallbackPorRol(k);
      }
    }
    this.config.navegacionPorRol = nav;
  }

  tieneRutaEnRol(rolNombre: string, path: string): boolean {
    const k = rolNombre.trim().toUpperCase();
    return !!this.config.navegacionPorRol?.[k]?.includes(path);
  }

  alternarRutaMenu(rolNombre: string, path: string, checked: boolean): void {
    const k = rolNombre.trim().toUpperCase();
    const actual = [...(this.config.navegacionPorRol?.[k] ?? [])];
    const set = new Set(actual);
    if (checked) set.add(path);
    else set.delete(path);
    this.config.navegacionPorRol = {
      ...(this.config.navegacionPorRol ?? {}),
      [k]: [...set],
    };
  }

  restaurarPredeterminadoMenu(rolNombre: string): void {
    const k = rolNombre.trim().toUpperCase();
    const paths = rutasMenuFallbackPorRol(k);
    this.config.navegacionPorRol = {
      ...(this.config.navegacionPorRol ?? {}),
      [k]: [...paths],
    };
    this.toast.exito(`Menú de ${rolNombre} restaurado al valor base. Pulsa «Guardar cambios» para aplicarlo.`);
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
        this.archivoLogoCompania = null;
        this.controlEdicion.marcarLimpio();
      },
      error: () => {
        this.guardando = false;
        this.error = 'No se pudieron guardar los cambios.';
        this.toast.error('No se pudieron guardar los cambios.');
      },
    });
  }

  cargarLogsCorreo(): void {
    this.cargandoLogsCorreo = true;
    this.configApi.listarLogsCorreo(30).subscribe({
      next: (logs) => {
        this.logsCorreo = logs;
        this.cargandoLogsCorreo = false;
      },
      error: () => {
        this.cargandoLogsCorreo = false;
      },
    });
  }

  probarCorreo(): void {
    const to = (this.correoPrueba || this.config.compania.emailInstitucional || '').trim();
    if (!to) {
      this.toast.error('Indica un correo de destino para la prueba.');
      return;
    }
    this.probandoCorreo = true;
    this.configApi.probarCorreo(to).subscribe({
      next: (r) => {
        this.probandoCorreo = false;
        this.toast.exito(r.message || 'Correo de prueba enviado.');
        this.cargarLogsCorreo();
      },
      error: (err: { error?: { error?: string } }) => {
        this.probandoCorreo = false;
        const msg = err?.error?.error ?? 'No se pudo enviar el correo de prueba.';
        this.toast.error(msg);
        this.cargarLogsCorreo();
      },
    });
  }

  formatearFechaLog(iso: string): string {
    try {
      return new Date(iso).toLocaleString('es-CL');
    } catch {
      return iso;
    }
  }

}
