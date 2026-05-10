import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { SidepIconsModule } from '../../shared/sidep-icons.module';

@Component({
  selector: 'app-password-forgot',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule],
  templateUrl: './password-forgot.component.html',
})
export class PasswordForgotComponent {
  private readonly http = inject(HttpClient);
  email = '';
  loading = false;
  msg: string | null = null;
  error: string | null = null;

  enviar(): void {
    if (!this.email.trim()) {
      this.error = 'Ingresa un correo válido.';
      return;
    }
    this.loading = true;
    this.error = null;
    this.msg = null;
    this.http
      .post('/api/auth/recuperar-password', { email: this.email.trim() })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.msg = 'Si el correo existe, enviamos un enlace de recuperación.';
        },
        error: () => {
          this.error = 'No se pudo enviar la solicitud.';
        },
      });
  }
}
