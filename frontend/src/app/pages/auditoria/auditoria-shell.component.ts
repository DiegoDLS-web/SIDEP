import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SidepIconsModule } from '../../shared/sidep-icons.module';

@Component({
  selector: 'app-auditoria-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SidepIconsModule],
  templateUrl: './auditoria-shell.component.html',
})
export class AuditoriaShellComponent {
  readonly tabs = [
    { path: 'dashboard', label: 'Panel general', icon: 'layout-dashboard' },
    { path: 'checklists', label: 'Checklists', icon: 'clipboard-check' },
    { path: 'usuarios', label: 'Usuarios', icon: 'users' },
    { path: 'log', label: 'Trazabilidad', icon: 'history' },
  ];
}
