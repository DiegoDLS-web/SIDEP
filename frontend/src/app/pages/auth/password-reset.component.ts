import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ConfiguracionesService } from '../../services/configuraciones.service';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { SidepBrandLockupComponent } from '../../shared/sidep-brand-lockup.component';
import { mensajeApiError } from '../../utils/api-error.util';

@Component({
  selector: 'app-password-reset',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule, SidepBrandLockupComponent],
  templateUrl: './password-reset.component.html',
})
export class PasswordResetComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly configApi = inject(ConfiguracionesService);

  readonly nombreCompaniaTag = signal<string | null>(null);

  password = '';
  confirm = '';
  loading = false;
  ok = false;
  error: string | null = null;

  get token(): string {
    return this.route.snapshot.paramMap.get('token') ?? '';
  }

  ngOnInit(): void {
    this.configApi.brandingPublic().subscribe({
      next: (b) => this.nombreCompaniaTag.set(b.nombreCompania?.trim() || null),
      error: () => this.nombreCompaniaTag.set('1ª Compañía Santa Juana'),
    });
    if (!this.token) {
      this.error = 'El enlace de recuperación no es válido. Solicita uno nuevo desde el login.';
    }
  }

  guardar(): void {
    if (!this.token) {
      this.error = 'El enlace de recuperación no es válido. Solicita uno nuevo desde el login.';
      return;
    }
    if (this.password.length < 8) {
      this.error = 'La contraseña debe tener al menos 8 caracteres.';
      return;
    }
    if (this.password !== this.confirm) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }
    this.loading = true;
    this.error = null;
    this.http
      .post('/api/auth/restablecer-password', { token: this.token, password: this.password })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.ok = true;
        },
        error: (err) => {
          this.error = mensajeApiError(err, 'No se pudo restablecer la contraseña.');
        },
      });
  }
}
