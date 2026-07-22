import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { MovimientoBodegaDto, StockBodegaDto } from '../../models/inventarios.dto';
import { InventariosService } from '../../services/inventarios.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { mensajeApiError } from '../../utils/api-error.util';
import { SidepIconsModule } from '../../shared/sidep-icons.module';

@Component({
  selector: 'app-inventarios-bodega',
  standalone: true,
  imports: [CommonModule, FormsModule, SidepIconsModule],
  templateUrl: './inventarios-bodega.component.html',
})
export class InventariosBodegaComponent implements OnInit {
  private readonly api = inject(InventariosService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  loading = true;
  guardando = false;
  stock: StockBodegaDto[] = [];
  movimientos: MovimientoBodegaDto[] = [];

  materialId = 0;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE' = 'ENTRADA';
  cantidad = 0;
  motivo = '';

  get puedeGestionar(): boolean {
    const rol = this.auth.usuarioActual?.rol?.trim().toUpperCase();
    return rol === 'ADMIN' || rol === 'CAPITAN' || rol === 'TENIENTE';
  }

  ngOnInit(): void {
    this.recargar();
  }

  recargar(): void {
    this.loading = true;
    this.api.listarStockBodega().subscribe({
      next: (stock) => {
        this.stock = stock;
        if (!this.materialId && stock.length) this.materialId = stock[0]!.materialId;
        this.api.listarMovimientos().subscribe({
          next: (mov) => {
            this.movimientos = mov;
            this.loading = false;
          },
          error: () => {
            this.loading = false;
          },
        });
      },
      error: () => {
        this.toast.error('No se pudo cargar el stock de bodega.');
        this.loading = false;
      },
    });
  }

  registrarMovimiento(): void {
    if (!this.puedeGestionar) return;
    if (!this.materialId || this.cantidad < 0) {
      this.toast.error('Selecciona material y cantidad válida.');
      return;
    }
    this.guardando = true;
    this.api
      .registrarMovimiento({
        materialId: this.materialId,
        tipo: this.tipo,
        cantidad: this.cantidad,
        motivo: this.motivo.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.guardando = false;
          this.cantidad = 0;
          this.motivo = '';
          this.toast.exito('Movimiento registrado.');
          this.recargar();
        },
        error: (err) => {
          this.guardando = false;
          this.toast.error(mensajeApiError(err, 'No se pudo registrar el movimiento.'));
        },
      });
  }

  formatoFecha(iso: string): string {
    return new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
  }
}
