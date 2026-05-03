import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ConfiguracionesService } from '../../services/configuraciones.service';
import { ToastService } from '../../services/toast.service';
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

  email = '';
  password = '';
  recordarme = false;
  loading = false;
  error: string | null = null;

  ngOnInit(): void {
    this.configApi.brandingPublic().subscribe({
      next: (b) => this.nombreCompaniaTag.set(b.nombreCompania?.trim() || null),
      error: () => this.nombreCompaniaTag.set('1ª Compañía Santa Juana'),
    });
  }

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
