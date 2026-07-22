import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SidepIconsModule } from '../../shared/sidep-icons.module';

@Component({
  selector: 'app-inventarios-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, SidepIconsModule],
  templateUrl: './inventarios-shell.component.html',
})
export class InventariosShellComponent {
  readonly tabs = [
    { path: '/inventarios', label: 'Inventario', icon: 'clipboard-list' },
    { path: '/inventarios/bodega', label: 'Gestión bodega', icon: 'package' },
  ];
}
