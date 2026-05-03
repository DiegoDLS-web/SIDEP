import { CommonModule, formatDate } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { UsuarioListaDto } from '../../models/usuario.dto';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { NavegacionUiService } from '../../services/navegacion-ui.service';
import { OPCIONES_MENU_SIDEP } from '../../layout/nav-menu-opciones';
import {
  etiquetaOficialidadCargo,
  ETIQUETAS_TIPO_VOLUNTARIO,
  REGIONES_COMUNAS_CHILE,
  GRUPOS_SANGUINEOS,
} from '../usuarios/usuario-registro.constants';

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule],
  templateUrl: './mi-perfil.component.html',
})
export class MiPerfilComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  readonly navUi = inject(NavegacionUiService);

  loading = true;
  error: string | null = null;
  perfil: UsuarioListaDto | null = null;
  fotoRota = false;

  editandoMisDatos = false;
  guardandoPerfil = false;
  errorForm: string | null = null;

  readonly regionesComunas = REGIONES_COMUNAS_CHILE;
  readonly gruposSanguineos: readonly string[] = GRUPOS_SANGUINEOS;

  fotoInicialMisDatos = '';
  miForm = this.miFormVacio();

  comunasDisponiblesMis: readonly string[] = [];

  ngOnInit(): void {
    this.navUi.refrescar();
    this.cargarPerfil();
  }

  etiquetaMenu(path: string): string {
    return OPCIONES_MENU_SIDEP.find((o) => o.path === path)?.label ?? path;
  }

  rutasMenuOrdenadas(): string[] {
    return [...this.navUi.permitidasSet()].sort((a, b) => a.localeCompare(b));
  }

  private miFormVacio() {
    return {
      email: '',
      telefono: '',
      direccion: '',
      region: '',
      comuna: '',
      actividad: '',
      grupoSanguineo: '',
      fotoPerfil: '',
    };
  }

  cargarPerfil(): void {
    this.loading = true;
    this.error = null;
    this.http.get<UsuarioListaDto>('/api/auth/mi-perfil').subscribe({
      next: (p) => {
        this.perfil = p;
        this.poblarMisForm(p);
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar tu perfil.';
        this.loading = false;
      },
    });
  }

  fechaCorta(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—' : formatDate(d, 'dd/MM/yyyy', 'es-CL');
  }

  chipOficialidad(p: UsuarioListaDto): string {
    return etiquetaOficialidadCargo(p.cargoOficialidad, p.rol);
  }

  etiquetaCategoria(tipo: string | null | undefined): string {
    if (!tipo) return 'Sin categoría';
    const u = tipo.trim().toUpperCase();
    return ETIQUETAS_TIPO_VOLUNTARIO[u] ?? tipo;
  }

  debeCambiarPassword(): boolean {
    return this.auth.usuarioActual?.requiereCambioPassword === true;
  }

  onFotoError(): void {
    this.fotoRota = true;
  }

  iniciales(nombre: string): string {
    return nombre
      .split(' ')
      .map((n) => n[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  private poblarMisForm(p: UsuarioListaDto): void {
    this.miForm = {
      email: p.email ?? '',
      telefono: p.telefono ?? '',
      direccion: p.direccion ?? '',
      region: p.region ?? '',
      comuna: p.comuna ?? '',
      actividad: p.actividad ?? '',
      grupoSanguineo: p.grupoSanguineo ?? '',
      fotoPerfil: p.fotoPerfil?.trim() ?? '',
    };
    this.fotoInicialMisDatos = this.miForm.fotoPerfil;
    this.actualizarComunasDesdeRegion();
  }

  private actualizarComunasDesdeRegion(): void {
    const r = REGIONES_COMUNAS_CHILE.find((x) => x.region === this.miForm.region);
    this.comunasDisponiblesMis = r?.comunas ?? [];
    if (this.miForm.comuna && !this.comunasDisponiblesMis.includes(this.miForm.comuna)) {
      this.miForm.comuna = '';
    }
  }

  onRegionChangeMi(): void {
    this.miForm.comuna = '';
    this.actualizarComunasDesdeRegion();
  }

  iniciarEdicionMisDatos(): void {
    if (!this.perfil) return;
    this.editandoMisDatos = true;
    this.errorForm = null;
    this.poblarMisForm(this.perfil);
  }

  cancelarEdicionMisDatos(): void {
    if (!this.perfil) return;
    this.editandoMisDatos = false;
    this.errorForm = null;
    this.guardandoPerfil = false;
    this.poblarMisForm(this.perfil);
  }

  private emailEsValido(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private telefonoChileEsValido(value: string): boolean {
    const digits = value.replace(/\D/g, '');
    const local = digits.startsWith('56') ? digits.slice(2) : digits;
    return /^9\d{8}$/.test(local);
  }

  onTelefonoInputMi(value: string): void {
    const digits = value.replace(/\D/g, '');
    let base = digits;
    if (base.startsWith('56')) base = base.slice(2);
    if (base.length > 9) base = base.slice(0, 9);
    if (!base) {
      this.miForm.telefono = '';
      return;
    }
    const formatted =
      base.length <= 1
        ? `+56 ${base}`
        : base.length <= 5
          ? `+56 ${base[0]} ${base.slice(1)}`
          : `+56 ${base[0]} ${base.slice(1, 5)} ${base.slice(5)}`;
    this.miForm.telefono = formatted.trim();
  }

  private validarMisDatos(): string | null {
    const m = this.miForm;
    if (!String(m.direccion).trim()) return 'Indica tu dirección.';
    if (!String(m.region).trim()) return 'Selecciona tu región.';
    if (!String(m.comuna).trim()) return 'Selecciona tu comuna.';
    if (this.comunasDisponiblesMis.length === 0) return 'Selecciona una región válida de Chile.';
    if (!this.comunasDisponiblesMis.includes(m.comuna)) return 'Selecciona una comuna válida para la región.';
    const em = String(m.email).trim();
    if (!em) return 'Indica tu correo electrónico.';
    if (!this.emailEsValido(em)) return 'El correo electrónico no tiene formato válido.';
    if (!this.telefonoChileEsValido(m.telefono)) {
      return 'El teléfono debe ser un celular chileno válido (ej: +56 9 1234 5678).';
    }
    const gs = String(m.grupoSanguineo).trim();
    if (gs && !this.gruposSanguineos.includes(gs)) {
      return 'Selecciona un grupo sanguíneo válido u omite el campo.';
    }
    return null;
  }

  quitarFotoMi(): void {
    this.miForm.fotoPerfil = '';
  }

  async onFotoPerfilArchivoMi(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const ok = /image\/(jpeg|jpg|png|webp)/i.test(file.type);
    if (!ok) {
      this.errorForm = 'Foto de perfil: solo JPEG, PNG o WebP.';
      this.toast.advertencia('Formato no permitido. Usa JPEG, PNG o WebP.');
      input.value = '';
      return;
    }
    if (file.size > 14 * 1024 * 1024) {
      this.errorForm = 'La imagen supera los 14 MB; elige otro archivo.';
      this.toast.advertencia('La imagen es demasiado grande.');
      input.value = '';
      return;
    }
    try {
      this.miForm.fotoPerfil = await this.comprimirFotoPerfil(file);
      this.errorForm = null;
    } catch {
      this.toast.error('No se pudo procesar la foto de perfil.');
    }
    input.value = '';
  }

  /** Reduce tamaño para data URL (misma lógica que gestión de usuarios). */
  private comprimirFotoPerfil(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('lectura'));
      reader.onload = () => {
        const dataUrlIn = typeof reader.result === 'string' ? reader.result : '';
        const img = new Image();
        img.onload = () => {
          const maxSide = 820;
          let w = img.naturalWidth;
          let h = img.naturalHeight;
          if (w < 1 || h < 1) {
            reject(new Error('imagen'));
            return;
          }
          const scale = Math.min(1, maxSide / Math.max(w, h));
          w = Math.round(w * scale);
          h = Math.round(h * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('canvas'));
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = () => reject(new Error('decode'));
        img.src = dataUrlIn;
      };
      reader.readAsDataURL(file);
    });
  }

  guardarMisDatos(): void {
    if (!this.perfil) return;
    const verr = this.validarMisDatos();
    if (verr) {
      this.errorForm = verr;
      this.toast.advertencia(verr);
      return;
    }
    this.guardandoPerfil = true;
    this.errorForm = null;

    const fp = this.miForm.fotoPerfil.trim();
    const fpIni = this.fotoInicialMisDatos.trim();

    const body: Record<string, unknown> = {
      grupoSanguineo: this.miForm.grupoSanguineo.trim() || null,
      direccion: this.miForm.direccion.trim(),
      region: this.miForm.region.trim(),
      comuna: this.miForm.comuna.trim(),
      actividad: this.miForm.actividad.trim() || null,
      email: this.miForm.email.trim(),
      telefono: this.miForm.telefono.trim(),
    };
    if (fp !== fpIni) {
      body['fotoPerfil'] = fp || null;
    }

    this.http.patch<UsuarioListaDto>('/api/auth/mi-perfil', body).subscribe({
      next: (p) => {
        this.perfil = p;
        this.editandoMisDatos = false;
        this.guardandoPerfil = false;
        this.fotoRota = false;
        this.poblarMisForm(p);
        this.toast.exito('Tus datos se actualizaron correctamente.');
      },
      error: (err: { error?: { error?: string } }) => {
        this.guardandoPerfil = false;
        const msg = err?.error?.error ?? 'No se pudieron guardar los cambios.';
        this.errorForm = msg;
        this.toast.error(msg);
      },
    });
  }
}
