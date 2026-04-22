import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { SidepIconsModule } from '../../shared/sidep-icons.module';

@Component({
  selector: 'app-cambiar-password-inicial',
  standalone: true,
  imports: [CommonModule, FormsModule, SidepIconsModule],
  templateUrl: './cambiar-password-inicial.component.html',
})
export class CambiarPasswordInicialComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  passwordActual = '';
  passwordNueva = '';
  passwordNueva2 = '';
  loading = false;
  error: string | null = null;

  guardar(): void {
    this.error = null;
    if (!this.passwordActual.trim()) {
      this.error = 'Indica la contraseña provisional.';
      return;
    }
    if (this.passwordNueva.length < 6) {
      this.error = 'La nueva contraseña debe tener al menos 6 caracteres.';
      return;
    }
    if (this.passwordNueva !== this.passwordNueva2) {
      this.error = 'La confirmación no coincide con la nueva contraseña.';
      return;
    }
    this.loading = true;
    this.auth
      .cambiarPasswordSesion(this.passwordActual.trim(), this.passwordNueva)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toast.exito('Contraseña actualizada. Ya puedes usar el sistema.');
          void this.router.navigateByUrl('/');
        },
        error: (err: { error?: { error?: string } }) => {
          const msg = err?.error?.error ?? 'No se pudo actualizar la contraseña.';
          this.error = msg;
          this.toast.error(msg);
        },
      });
  }
}
