import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-password-reset',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './password-reset.component.html',
})
export class PasswordResetComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  password = '';
  confirm = '';
  loading = false;
  ok = false;
  error: string | null = null;

  get token(): string {
    return this.route.snapshot.paramMap.get('token') ?? '';
  }

  guardar(): void {
    if (!this.token) {
      this.error = 'Token inválido.';
      return;
    }
    if (this.password.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres.';
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
        error: () => {
          this.error = 'No se pudo restablecer la contraseña.';
        },
      });
  }
}
