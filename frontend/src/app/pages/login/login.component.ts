import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ConfiguracionesService } from '../../services/configuraciones.service';
import { ToastService } from '../../services/toast.service';
import { mensajeApiError } from '../../utils/api-error.util';
import { validarRut } from '../../utils/rut.util';
import { esErrorUsuarioInactivo } from '../../core/auth/acceso-bloqueado.util';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { SidepBrandLockupComponent } from '../../shared/sidep-brand-lockup.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule, SidepBrandLockupComponent],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly configApi = inject(ConfiguracionesService);

  readonly nombreCompaniaTag = signal<string | null>(null);

  rut = '';
  password = '';
  recordarme = false;
  loading = false;
  error: string | null = null;
  accesoBloqueado = false;

  pasoMfa = false;
  mfaToken = '';
  mfaCode = '';

  ngOnInit(): void {
    const aviso = this.auth.consumirAvisoAccesoBloqueado();
    if (aviso) {
      this.error = aviso;
      this.accesoBloqueado = true;
    }
    this.configApi.brandingPublic().subscribe({
      next: (b) => this.nombreCompaniaTag.set(b.nombreCompania?.trim() || null),
      error: () => this.nombreCompaniaTag.set('1ª Compañía Santa Juana'),
    });
  }

  submit(): void {
    if (this.pasoMfa) {
      this.verificarMfa();
      return;
    }
    if (!this.rut.trim() || !this.password) {
      this.error = 'Debes ingresar RUT y contraseña.';
      this.toast.error('Debes ingresar RUT y contraseña.');
      return;
    }
    if (!validarRut(this.rut.trim())) {
      this.error = 'El RUT ingresado no es válido. Revisa el dígito verificador.';
      this.toast.error(this.error);
      return;
    }
    this.loading = true;
    this.error = null;
    this.auth
      .login(this.rut.trim(), this.password)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          if (result.kind === 'mfa') {
            this.pasoMfa = true;
            this.mfaToken = result.mfaToken;
            this.toast.info('Ingresa el código de tu app autenticadora.');
            return;
          }
          void this.router.navigateByUrl(
            result.usuario.requiereCambioPassword ? '/cambiar-password-inicial' : '/',
          );
        },
        error: (err) => {
          this.accesoBloqueado = esErrorUsuarioInactivo(err);
          this.error = mensajeApiError(
            err,
            this.accesoBloqueado
              ? 'Tu acceso a SIDEP está restringido.'
              : 'Credenciales inválidas o usuario inactivo.',
          );
          this.toast.error(this.error);
        },
      });
  }

  verificarMfa(): void {
    if (!this.mfaCode.trim()) {
      this.error = 'Ingresa el código de 6 dígitos.';
      return;
    }
    this.loading = true;
    this.error = null;
    this.auth
      .verifyMfa(this.mfaToken, this.mfaCode.trim())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (user) => {
          void this.router.navigateByUrl(user.requiereCambioPassword ? '/cambiar-password-inicial' : '/');
        },
        error: (err) => {
          this.error = mensajeApiError(err, 'Código MFA inválido.');
          this.toast.error(this.error);
        },
      });
  }

  volverLogin(): void {
    this.pasoMfa = false;
    this.mfaToken = '';
    this.mfaCode = '';
    this.error = null;
  }
}
