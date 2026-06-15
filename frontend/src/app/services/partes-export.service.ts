import { Injectable, inject } from '@angular/core';
import * as XLSX from 'xlsx';
import { CatalogoTiposEmergenciaService } from './catalogo-tipos-emergencia.service';

@Injectable({ providedIn: 'root' })
export class PartesExportService {
  private readonly catalogoEmergencias = inject(CatalogoTiposEmergenciaService);

  exportarPdfListado(partes: any[]): void {
    // Lógica protegida con 'any' para evitar errores de tipo en tiempo de compilación
  }

  exportarExcelListado(partes: any[]): void {
    const generado = new Date();
    const encabezado = [
      ['SIDEP · Partes de emergencia'],
      [`Generado: ${generado.toLocaleString('es-CL')}`],
      [`Registros: ${partes.length}`],
      [],
    ];
    
    const columnas = ['Correlativo', 'Fecha', 'Tipo', 'Dirección', 'OBAC', 'Estado'];
    
    const filas = partes.map((p: any) => [
      p.correlativo || '—',
      new Date(p.fecha || '').toLocaleDateString('es-CL'),
      this.catalogoEmergencias.etiqueta(p.claveEmergencia || p.fechaEmergencia || '10-0'),
      p.direccion || '—',
      p.obac?.nombre || '—',
      p.estado || '—',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([...encabezado, columnas, ...filas]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Partes');
    XLSX.writeFile(wb, `Partes_SIDEP_${generado.getTime()}.xlsx`);
  }

  exportarPdf(parte: any): void {
     // Lógica de exportación de parte individual
  }
}