import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ConfiguracionesService } from '../../services/configuraciones.service';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { SidepBrandLockupComponent } from '../../shared/sidep-brand-lockup.component';
import { mensajeApiError } from '../../utils/api-error.util';

@Component({
  selector: 'app-password-forgot',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule, SidepBrandLockupComponent],
  templateUrl: './password-forgot.component.html',
})
export class PasswordForgotComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly configApi = inject(ConfiguracionesService);

  readonly nombreCompaniaTag = signal<string | null>(null);

  email = '';
  loading = false;
  msg: string | null = null;
  error: string | null = null;

  ngOnInit(): void {
    this.configApi.brandingPublic().subscribe({
      next: (b) => this.nombreCompaniaTag.set(b.nombreCompania?.trim() || null),
      error: () => this.nombreCompaniaTag.set('1ª Compañía Santa Juana'),
    });
  }

  enviar(): void {
    const correo = this.email.trim();
    if (!correo || !correo.includes('@')) {
      this.error = 'Ingresa un correo electrónico válido.';
      return;
    }
    this.loading = true;
    this.error = null;
    this.msg = null;
    this.http
      .post<{ success: boolean; message?: string }>('/api/auth/recuperar-password', { email: correo })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.msg = 'Revisa tu bandeja de entrada y la carpeta de spam. El enlace es válido por 2 horas.';
        },
        error: (err) => {
          this.error = mensajeApiError(err, 'No se pudo enviar la solicitud.');
        },
      });
  }
}
