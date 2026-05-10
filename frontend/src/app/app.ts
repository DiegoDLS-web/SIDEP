import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { ToastContainerComponent } from './shared/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class AppComponent {
  private readonly auth = inject(AuthService);

  constructor() {
    // Refresca usuario con el servidor si había token guardado (F5 / vuelta a la pestaña).
    this.auth.cargarSesion().subscribe();
  }
}
