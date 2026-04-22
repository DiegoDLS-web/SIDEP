import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { SidepIconsModule } from '../../shared/sidep-icons.module';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  email = '';
  password = '';
  recordarme = false;
  loading = false;
  error: string | null = null;

  submit(): void {
    if (!this.email.trim() || !this.password) {
      this.entrarDemo();
      return;
    }
    this.loading = true;
    this.error = null;
    this.auth
      .login(this.email.trim(), this.password)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/');
        },
        error: () => {
          this.error = 'Credenciales inválidas o usuario inactivo.';
          this.toast.error('Credenciales inválidas o usuario inactivo.');
        },
      });
  }

  entrarDemo(): void {
    this.loading = true;
    this.error = null;
    this.auth
      .loginDemo()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/');
        },
        error: () => {
          this.error = 'No se pudo iniciar en modo demo.';
          this.toast.error('No se pudo iniciar en modo demo.');
        },
      });
  }
}
