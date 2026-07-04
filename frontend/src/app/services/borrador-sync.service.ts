import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  BorradorLocalEnvelope,
  BorradorLocalService,
  BorradorLocalTipo,
  BorradorSyncRequest,
} from './borrador-local.service';
import { ChecklistsService } from './checklists.service';
import { BolsosTraumaService } from './bolsos-trauma.service';
import { PartesService } from './partes.service';
import { CarrosService } from './carros.service';
import { ToastService } from './toast.service';
import { esErrorSinConexion } from '../utils/api-error.util';

@Injectable({ providedIn: 'root' })
export class BorradorSyncService {
  private readonly borradorLocal = inject(BorradorLocalService);
  private readonly checklistsApi = inject(ChecklistsService);
  private readonly bolsosApi = inject(BolsosTraumaService);
  private readonly partesApi = inject(PartesService);
  private readonly carrosApi = inject(CarrosService);
  private readonly toast = inject(ToastService);

  private sincronizando = false;
  private escuchaActiva = false;

  iniciarEscuchaAutomatica(): void {
    if (this.escuchaActiva || typeof window === 'undefined') return;
    this.escuchaActiva = true;
    window.addEventListener('online', () => {
      void this.sincronizarPendientes({ silencioso: false });
    });
    if (navigator.onLine) {
      void this.sincronizarPendientes({ silencioso: true });
    }
  }

  async sincronizarPendientes(opts?: { silencioso?: boolean }): Promise<number> {
    if (!navigator.onLine || this.sincronizando) return 0;
    const pendientes = this.borradorLocal.listarTodos();
    if (!pendientes.length) return 0;

    this.sincronizando = true;
    let sincronizados = 0;
    try {
      for (const item of pendientes) {
        try {
          await this.sincronizarUno(item);
          this.borradorLocal.eliminar(item.meta.tipo, item.meta.clave);
          sincronizados += 1;
        } catch (err) {
          if (esErrorSinConexion(err)) break;
        }
      }
    } finally {
      this.sincronizando = false;
    }

    if (sincronizados > 0 && !opts?.silencioso) {
      this.toast.exito(
        sincronizados === 1
          ? '1 borrador local sincronizado con el servidor.'
          : `${sincronizados} borradores locales sincronizados con el servidor.`,
      );
    }
    return sincronizados;
  }

  private async sincronizarUno(item: BorradorLocalEnvelope): Promise<void> {
    const sync = item.syncRequest;
    if (!sync) {
      throw new Error('Sin datos de sincronización');
    }

    switch (sync.kind) {
      case 'checklist-unidad':
        await firstValueFrom(this.checklistsApi.guardarChecklistUnidad(sync.unidad!, sync.body));
        return;
      case 'checklist-era':
        await firstValueFrom(this.checklistsApi.guardarChecklistEra(sync.body));
        return;
      case 'bolso-trauma':
        await firstValueFrom(this.bolsosApi.guardar(sync.unidad!, sync.body));
        return;
      case 'parte-crear':
        await firstValueFrom(this.partesApi.crear(sync.body));
        return;
      case 'parte-actualizar':
        await firstValueFrom(this.partesApi.actualizar(String(sync.parteId), sync.body));
        return;
      case 'carro-mantenimiento-crear':
        await firstValueFrom(this.carrosApi.actualizar(String(sync.carroId), sync.body));
        return;
      case 'carro-mantenimiento-editar':
        await firstValueFrom(
          this.carrosApi.actualizarMantenimientoHistorial(String(sync.mantenimientoEditId), sync.body),
        );
        return;
      default:
        throw new Error(`Tipo de sync no soportado: ${(sync as BorradorSyncRequest).kind}`);
    }
  }
}
