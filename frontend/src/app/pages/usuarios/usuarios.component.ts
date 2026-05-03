import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { UsuarioActualizarDto, UsuarioCrearDto, UsuarioListaDto } from '../../models/usuario.dto';
import type { RolUsuarioDto } from '../../models/rol.dto';
import { AuthService } from '../../services/auth.service';
import { RolesService } from '../../services/roles.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { ToastService } from '../../services/toast.service';
import { UsuariosService } from '../../services/usuarios.service';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import {
  CARGOS_OFICIALIDAD_ORDEN,
  ETIQUETAS_CARGO_OFICIALIDAD,
  ETIQUETAS_TIPO_VOLUNTARIO,
  GRUPOS_SANGUINEOS,
  REGIONES_COMUNAS_CHILE,
  ROLES_SISTEMA_FALLBACK,
  TIPOS_VOLUNTARIO_ORDEN,
  etiquetaOficialidadCargo,
} from './usuario-registro.constants';

type FormUsuario = {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  rut: string;
  nacionalidad: string;
  grupoSanguineo: string;
  direccion: string;
  region: string;
  comuna: string;
  actividad: string;
  fechaNacimiento: string;
  fechaIngreso: string;
  email: string;
  telefono: string;
  tipoVoluntario: string;
  cuerpoBombero: string;
  compania: string;
  estadoVoluntario: string;
  cargoOficialidad: string;
  rol: string;
  observacionesRegistro: string;
  firmaImagen: string;
  fotoPerfil: string;
};

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule],
  templateUrl: './usuarios.component.html',
})
export class UsuariosComponent implements OnInit {
  private readonly usuariosApi = inject(UsuariosService);
  private readonly rolesApi = inject(RolesService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly cargosOrden = CARGOS_OFICIALIDAD_ORDEN;
  readonly etiquetasCargo = ETIQUETAS_CARGO_OFICIALIDAD;
  readonly tiposVoluntario = TIPOS_VOLUNTARIO_ORDEN;
  readonly etiquetasTipoVoluntario = ETIQUETAS_TIPO_VOLUNTARIO;
  readonly gruposSanguineos = GRUPOS_SANGUINEOS;
  readonly regionesComunas = REGIONES_COMUNAS_CHILE;
  readonly rolesFallback = ROLES_SISTEMA_FALLBACK;

  usuarios: UsuarioListaDto[] = [];
  loading = true;
  guardando = false;
  error: string | null = null;
  exito: string | null = null;
  busqueda = '';
  /** Página visible del directorio tras filtro (1-based). */
  paginaLista = 1;
  readonly tamanioPagina = 9;

  mostrandoFormulario = false;
  editandoId: number | null = null;
  /** Al editar: valor inicial de firma para no enviar PATCH si no hubo cambios. */
  private firmaInicialEdicion: string | null = null;
  /** Al editar: valor inicial de foto de perfil. */
  private fotoInicialEdicion: string | null = null;
  /** Evita íconos rotos cuando falta el fichero en `/assets/perfiles`. */
  private readonly fotosListaFallidas = new Set<number>();

  form: FormUsuario = this.formVacio();

  roles: RolUsuarioDto[] = [];

  ngOnInit(): void {
    this.cargarRoles();
    this.cargarUsuarios();
  }

  get puedeEditarRol(): boolean {
    const r = this.auth.usuarioActual?.rol?.trim().toUpperCase();
    return r === 'ADMIN';
  }

  get esAdmin(): boolean {
    return this.auth.usuarioActual?.rol?.trim().toUpperCase() === 'ADMIN';
  }

  private formVacio(): FormUsuario {
    return {
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      rut: '',
      nacionalidad: 'Chilena',
      grupoSanguineo: '',
      direccion: '',
      region: '',
      comuna: '',
      actividad: '',
      fechaNacimiento: '',
      fechaIngreso: '',
      email: '',
      telefono: '',
      tipoVoluntario: 'VOLUNTARIO',
      cuerpoBombero: '',
      compania: '',
      estadoVoluntario: 'VIGENTE',
      cargoOficialidad: 'VOLUNTARIO',
      rol: 'VOLUNTARIOS',
      observacionesRegistro: '',
      firmaImagen: '',
      fotoPerfil: '',
    };
  }

  private toInputDate(iso: string | null | undefined): string {
    if (!iso) {
      return '';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    return d.toISOString().slice(0, 10);
  }

  cargarRoles(): void {
    this.rolesApi.listar(true).subscribe({
      next: (data) => {
        this.roles = data.length
          ? data
          : this.rolesFallback.map((nombre, idx) => ({
              id: idx + 1,
              nombre,
              activo: true,
              createdAt: '',
              updatedAt: '',
            }));
        if (!this.form.rol?.trim() && this.roles.length > 0) {
          this.form.rol = this.roles[0]!.nombre;
        }
      },
      error: () => {
        this.roles = this.rolesFallback.map((nombre, idx) => ({
          id: idx + 1,
          nombre,
          activo: true,
          createdAt: '',
          updatedAt: '',
        }));
        this.form.rol = this.form.rol?.trim() || this.roles[0]!.nombre;
        this.toast.advertencia('No se pudieron cargar roles desde API, se usó listado base.');
      },
    });
  }

  get comunasDisponibles(): string[] {
    const region = this.form.region.trim();
    if (!region) return [];
    return [...(this.regionesComunas.find((r) => r.region === region)?.comunas ?? [])].sort((a, b) =>
      a.localeCompare(b, 'es-CL'),
    );
  }

  onRegionChange(): void {
    if (!this.comunasDisponibles.includes(this.form.comuna)) {
      this.form.comuna = '';
    }
  }

  private limpiarRut(value: string): string {
    return value.replace(/[^0-9kK]/g, '').toUpperCase();
  }

  private formatearRut(value: string): string {
    const limpio = this.limpiarRut(value);
    if (limpio.length <= 1) return limpio;
    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);
    const cuerpoConPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${cuerpoConPuntos}-${dv}`;
  }

  onRutInput(value: string): void {
    this.form.rut = this.formatearRut(value);
  }

  private rutEsValido(value: string): boolean {
    const limpio = this.limpiarRut(value);
    if (limpio.length < 2) return false;
    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);
    let suma = 0;
    let multiplo = 2;
    for (let i = cuerpo.length - 1; i >= 0; i -= 1) {
      suma += Number(cuerpo[i]) * multiplo;
      multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }
    const resto = 11 - (suma % 11);
    const esperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
    return dv === esperado;
  }

  private emailEsValido(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  onTelefonoInput(value: string): void {
    const digits = value.replace(/\D/g, '');
    let base = digits;
    if (base.startsWith('56')) base = base.slice(2);
    if (base.length > 9) base = base.slice(0, 9);
    if (!base) {
      this.form.telefono = '';
      return;
    }
    const formatted =
      base.length <= 1
        ? `+56 ${base}`
        : base.length <= 5
          ? `+56 ${base[0]} ${base.slice(1)}`
          : `+56 ${base[0]} ${base.slice(1, 5)} ${base.slice(5)}`;
    this.form.telefono = formatted.trim();
  }

  private telefonoChileEsValido(value: string): boolean {
    const digits = value.replace(/\D/g, '');
    const local = digits.startsWith('56') ? digits.slice(2) : digits;
    return /^9\d{8}$/.test(local);
  }

  cargarUsuarios(): void {
    this.loading = true;
    this.error = null;
    this.usuariosApi.listar().subscribe({
        next: (data) => {
        this.usuarios = data;
        this.fotosListaFallidas.clear();
        this.paginaLista = 1;
        this.loading = false;
        this.abrirEdicionPorQuerySiAplica();
      },
      error: () => {
        this.error = 'No se pudieron cargar los usuarios.';
        this.toast.error('No se pudieron cargar los usuarios.');
        this.loading = false;
      },
    });
  }

  abrirNuevo(): void {
    this.mostrandoFormulario = true;
    this.editandoId = null;
    this.firmaInicialEdicion = null;
    this.fotoInicialEdicion = null;
    this.exito = null;
    this.form = this.formVacio();
    if (this.roles.length > 0) {
      this.form.rol = this.roles[0]!.nombre;
    }
  }

  editar(usuario: UsuarioListaDto): void {
    this.mostrandoFormulario = true;
    this.editandoId = usuario.id;
    this.firmaInicialEdicion = usuario.firmaImagen ?? '';
    this.fotoInicialEdicion = usuario.fotoPerfil?.trim() ? usuario.fotoPerfil! : '';
    this.exito = null;
    this.form = {
      nombres: usuario.nombres ?? '',
      apellidoPaterno: usuario.apellidoPaterno ?? '',
      apellidoMaterno: usuario.apellidoMaterno ?? '',
      rut: usuario.rut,
      nacionalidad: usuario.nacionalidad ?? '',
      grupoSanguineo: usuario.grupoSanguineo ?? '',
      direccion: usuario.direccion ?? '',
      region: usuario.region ?? '',
      comuna: usuario.comuna ?? '',
      actividad: usuario.actividad ?? '',
      fechaNacimiento: this.toInputDate(usuario.fechaNacimiento),
      fechaIngreso: this.toInputDate(usuario.fechaIngreso),
      email: usuario.email ?? '',
      telefono: usuario.telefono ?? '',
      tipoVoluntario: usuario.tipoVoluntario ?? 'VOLUNTARIO',
      cuerpoBombero: usuario.cuerpoBombero ?? '',
      compania: usuario.compania ?? '',
      estadoVoluntario: usuario.estadoVoluntario ?? 'VIGENTE',
      cargoOficialidad: usuario.cargoOficialidad ?? 'VOLUNTARIO',
      rol: usuario.rol,
      observacionesRegistro: usuario.observacionesRegistro ?? '',
      firmaImagen: usuario.firmaImagen ?? '',
      fotoPerfil: usuario.fotoPerfil?.trim() ? usuario.fotoPerfil! : '',
    };
  }

  cancelarForm(): void {
    this.mostrandoFormulario = false;
    this.editandoId = null;
    this.firmaInicialEdicion = null;
    this.fotoInicialEdicion = null;
  }

  /** Cierra modal al hacer clic en el backdrop (sin cerrar desde el panel interior). */
  cerrarSiBackdrop(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) {
      this.cancelarForm();
    }
  }

  @HostListener('document:keydown.escape')
  cerrarModalConEscape(): void {
    if (this.mostrandoFormulario) {
      this.cancelarForm();
    }
  }

  setBusqueda(v: string): void {
    const next = typeof v === 'string' ? v : '';
    this.busqueda = next;
    this.paginaLista = 1;
  }

  etiquetaChipOficialidad(usuario: UsuarioListaDto): string {
    return etiquetaOficialidadCargo(usuario.cargoOficialidad, usuario.rol);
  }

  private limpiarQueryEditId(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { editId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private abrirEdicionPorQuerySiAplica(): void {
    const raw = this.route.snapshot.queryParamMap.get('editId');
    if (!raw?.trim()) return;
    const editId = Number(raw);
    if (!Number.isFinite(editId) || editId < 1) {
      this.limpiarQueryEditId();
      return;
    }
    const yo = this.auth.usuarioActual;
    if (yo?.id !== editId && !this.esAdmin) {
      this.limpiarQueryEditId();
      return;
    }
    const u = this.usuarios.find((x) => x.id === editId);
    if (!u) {
      return;
    }
    this.editar(u);
    this.limpiarQueryEditId();
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.filtrados.length / this.tamanioPagina));
  }

  /** Asegura que la página actual exista después de filtros con menos ítems. */
  syncPagina(): void {
    if (this.paginaLista > this.totalPaginas) {
      this.paginaLista = this.totalPaginas;
    }
    if (this.paginaLista < 1) {
      this.paginaLista = 1;
    }
  }

  get filtradosPagina(): UsuarioListaDto[] {
    this.syncPagina();
    const start = (this.paginaLista - 1) * this.tamanioPagina;
    return this.filtrados.slice(start, start + this.tamanioPagina);
  }

  cambiarPagina(delta: number): void {
    const nueva = this.paginaLista + delta;
    if (nueva >= 1 && nueva <= this.totalPaginas) {
      this.paginaLista = nueva;
    }
  }

  onFirmaArchivo(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const ok = /image\/(jpeg|jpg|png)/i.test(file.type);
    if (!ok) {
      this.error = 'Solo se permiten imágenes JPEG o PNG.';
      this.toast.advertencia('Solo se permiten imágenes JPEG o PNG.');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      this.form.firmaImagen = dataUrl;
      this.error = null;
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  quitarFirma(): void {
    this.form.firmaImagen = '';
  }

  async onFotoPerfilArchivo(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const ok = /image\/(jpeg|jpg|png|webp)/i.test(file.type);
    if (!ok) {
      this.error = 'Foto de perfil: solo JPEG, PNG o WebP.';
      this.toast.advertencia('Formato no permitido. Usa JPEG, PNG o WebP.');
      input.value = '';
      return;
    }
    if (file.size > 14 * 1024 * 1024) {
      this.error = 'La imagen supera los 14 MB; elige otro archivo.';
      this.toast.advertencia('La imagen es demasiado grande.');
      input.value = '';
      return;
    }
    try {
      this.form.fotoPerfil = await this.comprimirFotoPerfil(file);
      this.error = null;
    } catch {
      this.toast.error('No se pudo procesar la foto de perfil.');
    }
    input.value = '';
  }

  /** Reduce tamaño para data URL antes de POST/PATCH (máx. lado ~820 px, JPEG ~0.82). */
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

  quitarFotoPerfil(): void {
    this.form.fotoPerfil = '';
  }

  fotoListaVisible(usuario: UsuarioListaDto): boolean {
    const fp = usuario.fotoPerfil?.trim();
    return !!fp && !this.fotosListaFallidas.has(usuario.id);
  }

  onFotoListaError(usuarioId: number): void {
    this.fotosListaFallidas.add(usuarioId);
  }

  private camposObligatoriosCreacionEdicion(): (keyof FormUsuario)[] {
    return [
      'nombres',
      'apellidoPaterno',
      'apellidoMaterno',
      'rut',
      'nacionalidad',
      'direccion',
      'region',
      'comuna',
      'fechaNacimiento',
      'fechaIngreso',
      'email',
      'telefono',
      'tipoVoluntario',
      'cuerpoBombero',
      'compania',
      'estadoVoluntario',
      'cargoOficialidad',
      'rol',
    ];
  }

  private validarCreacion(): string | null {
    const f = this.form;
    this.form.rut = this.formatearRut(this.form.rut);
    for (const k of this.camposObligatoriosCreacionEdicion()) {
      if (!String(f[k]).trim()) {
        return 'Completa todos los campos obligatorios (marcados con *).';
      }
    }
    if (!this.rutEsValido(f.rut)) return 'El RUT no es válido.';
    if (!this.emailEsValido(f.email.trim())) return 'El correo electrónico no tiene formato válido.';
    if (!this.telefonoChileEsValido(f.telefono)) return 'El teléfono debe ser celular chileno válido (ej: +56 9 1234 5678).';
    if (this.comunasDisponibles.length === 0) return 'Selecciona una región válida de Chile.';
    if (!this.comunasDisponibles.includes(f.comuna)) return 'Selecciona una comuna válida para la región elegida.';
    return null;
  }

  private validarEdicion(): string | null {
    const f = this.form;
    this.form.rut = this.formatearRut(this.form.rut);
    const obr = [
      'direccion',
      'region',
      'comuna',
      'tipoVoluntario',
      'cuerpoBombero',
      'compania',
      'estadoVoluntario',
      'cargoOficialidad',
    ] as const;
    for (const k of obr) {
      if (!String(f[k]).trim()) {
        return 'Completa todos los campos obligatorios (marcados con *).';
      }
    }
    if (!String(f.rol).trim()) {
      return 'Completa todos los campos obligatorios (marcados con *).';
    }
    if (!this.rutEsValido(f.rut)) return 'El RUT no es válido.';
    const email = f.email.trim();
    if (!email) return 'Indica un correo electrónico.';
    if (!this.emailEsValido(email)) return 'El correo electrónico no tiene formato válido.';
    if (!this.telefonoChileEsValido(f.telefono))
      return 'El teléfono debe ser celular chileno válido (ej: +56 9 1234 5678).';
    if (this.comunasDisponibles.length === 0) return 'Selecciona una región válida de Chile.';
    if (!this.comunasDisponibles.includes(f.comuna)) return 'Selecciona una comuna válida para la región elegida.';
    if (f.fechaNacimiento.trim()) {
      const d = new Date(f.fechaNacimiento);
      if (Number.isNaN(d.getTime())) return 'La fecha de nacimiento no es válida.';
    }
    if (f.fechaIngreso.trim()) {
      const d = new Date(f.fechaIngreso);
      if (Number.isNaN(d.getTime())) return 'La fecha de ingreso no es válida.';
    }
    return null;
  }

  guardar(): void {
    this.guardando = true;
    this.error = null;
    this.exito = null;

    if (this.editandoId) {
      const errEd = this.validarEdicion();
      if (errEd) {
        this.guardando = false;
        this.error = errEd;
        return;
      }
      const payload: UsuarioActualizarDto = {
        grupoSanguineo: this.form.grupoSanguineo.trim() || null,
        direccion: this.form.direccion.trim(),
        region: this.form.region.trim(),
        comuna: this.form.comuna.trim(),
        actividad: this.form.actividad.trim() || null,
        email: this.form.email.trim() || null,
        telefono: this.form.telefono.trim() || null,
        tipoVoluntario: this.form.tipoVoluntario.trim(),
        cuerpoBombero: this.form.cuerpoBombero.trim(),
        compania: this.form.compania.trim(),
        estadoVoluntario: this.form.estadoVoluntario.trim(),
        cargoOficialidad: this.form.cargoOficialidad.trim(),
        activo: this.form.estadoVoluntario === 'VIGENTE',
        observacionesRegistro: this.form.observacionesRegistro.trim() || null,
      };
      if (this.form.fechaNacimiento.trim()) {
        payload.fechaNacimiento = this.form.fechaNacimiento;
      }
      if (this.form.fechaIngreso.trim()) {
        payload.fechaIngreso = this.form.fechaIngreso;
      }
      const firmaActual = this.form.firmaImagen.trim();
      const firmaIni = (this.firmaInicialEdicion ?? '').trim();
      if (firmaActual !== firmaIni) {
        payload.firmaImagen = firmaActual || null;
      }
      const fotoActual = this.form.fotoPerfil.trim();
      const fotoIni = (this.fotoInicialEdicion ?? '').trim();
      if (fotoActual !== fotoIni) {
        payload.fotoPerfil = fotoActual || null;
      }
      if (this.puedeEditarRol) {
        payload.rol = this.form.rol.trim();
      }

      this.usuariosApi.actualizar(this.editandoId, payload).subscribe({
        next: () => {
          this.guardando = false;
          this.mostrandoFormulario = false;
          this.editandoId = null;
          this.exito = 'Usuario actualizado correctamente.';
          this.toast.exito('Usuario actualizado correctamente.');
          this.cargarUsuarios();
        },
        error: (err) => {
          this.guardando = false;
          const msg = err?.error?.error ?? 'No se pudo actualizar el usuario.';
          this.error = msg;
          this.toast.error(msg);
        },
      });
      return;
    }

    const err = this.validarCreacion();
    if (err) {
      this.guardando = false;
      this.error = err;
      return;
    }

    const crear: UsuarioCrearDto = {
      nombres: this.form.nombres.trim(),
      apellidoPaterno: this.form.apellidoPaterno.trim(),
      apellidoMaterno: this.form.apellidoMaterno.trim(),
      rut: this.formatearRut(this.form.rut),
      nacionalidad: this.form.nacionalidad.trim(),
      grupoSanguineo: this.form.grupoSanguineo.trim(),
      direccion: this.form.direccion.trim(),
      region: this.form.region.trim(),
      comuna: this.form.comuna.trim(),
      actividad: this.form.actividad.trim(),
      fechaNacimiento: this.form.fechaNacimiento,
      fechaIngreso: this.form.fechaIngreso,
      email: this.form.email.trim(),
      telefono: this.form.telefono.trim(),
      tipoVoluntario: this.form.tipoVoluntario.trim(),
      cuerpoBombero: this.form.cuerpoBombero.trim(),
      compania: this.form.compania.trim(),
      estadoVoluntario: this.form.estadoVoluntario.trim(),
      cargoOficialidad: this.form.cargoOficialidad.trim(),
      rol: this.form.rol.trim(),
      observacionesRegistro: this.form.observacionesRegistro.trim() || null,
      firmaImagen: this.form.firmaImagen.trim() || null,
      fotoPerfil: this.form.fotoPerfil.trim() || null,
    };

    this.usuariosApi.crear(crear).subscribe({
      next: () => {
        this.guardando = false;
        this.mostrandoFormulario = false;
        this.exito = 'Usuario creado correctamente.';
        this.toast.exito('Usuario creado correctamente.');
        this.cargarUsuarios();
      },
      error: (err) => {
        this.guardando = false;
        const msg = err?.error?.error ?? 'No se pudo crear el usuario (revisa RUT/email únicos).';
        this.error = msg;
        this.toast.error(msg);
      },
    });
  }

  cambiarEstado(usuario: UsuarioListaDto): void {
    const siguiente = usuario.estadoVoluntario === 'INACTIVO' ? 'VIGENTE' : 'INACTIVO';
    this.usuariosApi
      .actualizar(usuario.id, {
        estadoVoluntario: siguiente,
        activo: siguiente === 'VIGENTE',
      })
      .subscribe({
        next: () => {
          this.toast.exito(
            siguiente === 'VIGENTE' ? 'Usuario activado en el listado.' : 'Usuario marcado como inactivo.',
          );
          this.cargarUsuarios();
        },
        error: () => {
          this.error = 'No se pudo cambiar el estado del usuario.';
          this.toast.error('No se pudo cambiar el estado del usuario.');
        },
      });
  }

  etiquetaCargo(codigo: string | null | undefined): string {
    if (!codigo) {
      return '—';
    }
    return this.etiquetasCargo[codigo] ?? codigo;
  }

  etiquetaTipoVoluntario(tipo: string | null | undefined): string {
    if (!tipo) {
      return 'Sin categoría';
    }
    const u = tipo.trim().toUpperCase();
    return this.etiquetasTipoVoluntario[u] ?? tipo;
  }

  get filtrados(): UsuarioListaDto[] {
    const term = this.busqueda.trim().toLowerCase();
    if (!term) {
      return this.usuarios;
    }
    return this.usuarios.filter((u) => {
      const cargo = this.etiquetaCargo(u.cargoOficialidad).toLowerCase();
      const oficialidad = etiquetaOficialidadCargo(u.cargoOficialidad, u.rol).toLowerCase();
      const tipoVol = this.etiquetaTipoVoluntario(u.tipoVoluntario).toLowerCase();
      return (
        u.nombre.toLowerCase().includes(term) ||
        (u.nombres ?? '').toLowerCase().includes(term) ||
        (u.apellidoPaterno ?? '').toLowerCase().includes(term) ||
        (u.apellidoMaterno ?? '').toLowerCase().includes(term) ||
        u.rut.toLowerCase().includes(term) ||
        (u.email ?? '').toLowerCase().includes(term) ||
        (u.compania ?? '').toLowerCase().includes(term) ||
        (u.rol ?? '').toLowerCase().includes(term) ||
        cargo.includes(term) ||
        oficialidad.includes(term) ||
        tipoVol.includes(term) ||
        (u.tipoVoluntario ?? '').toLowerCase().includes(term)
      );
    });
  }

  totalActivos(): number {
    return this.usuarios.filter((u) => u.activo).length;
  }

  totalInactivos(): number {
    return this.usuarios.filter((u) => !u.activo).length;
  }

  totalRoles(): number {
    return new Set(this.usuarios.map((u) => u.rol)).size;
  }

  totalConLicencia(): number {
    return this.usuarios.filter((u) => {
      const tipo = (u.tipoVoluntario ?? '').toUpperCase();
      return tipo.includes('LICENCIA');
    }).length;
  }

  totalConSuspension(): number {
    return this.usuarios.filter((u) => {
      const tipo = (u.tipoVoluntario ?? '').toUpperCase();
      const estado = (u.estadoVoluntario ?? '').toUpperCase();
      return tipo.includes('SUSP') || estado.includes('SUSP');
    }).length;
  }

  async eliminar(usuario: UsuarioListaDto): Promise<void> {
    if (!this.esAdmin) {
      return;
    }
    const yo = this.auth.usuarioActual;
    if (yo && yo.id === usuario.id) {
      this.toast.advertencia('No puedes eliminar tu propio usuario.');
      return;
    }
    const ok = await this.confirmDialog.abrir({
      title: 'Confirmar eliminación',
      message: `¿Deseas eliminar al usuario "${usuario.nombre}"?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });
    if (!ok) return;
    this.usuariosApi.eliminar(usuario.id).subscribe({
      next: (resp) => {
        if (resp.softDeleted) {
          this.toast.advertencia(
            resp.message ||
              'No se pudo eliminar físicamente por historial relacionado; usuario dado de baja.',
          );
        } else {
          this.toast.exito('Usuario eliminado correctamente.');
        }
        this.cargarUsuarios();
      },
      error: (err) => {
        const msg = err?.error?.error ?? 'No se pudo eliminar el usuario.';
        this.error = msg;
        this.toast.error(msg);
      },
    });
  }

  iniciales(nombre: string): string {
    return nombre
      .split(' ')
      .map((n) => n[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}
