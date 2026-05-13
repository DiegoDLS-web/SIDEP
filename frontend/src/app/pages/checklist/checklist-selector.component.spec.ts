import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { ChecklistSelectorComponent } from './checklist-selector.component';
import { ChecklistsService } from '../../services/checklists.service';
import { PdfExportService } from '../../services/pdf-export.service';

describe('ChecklistSelectorComponent (estado)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChecklistSelectorComponent],
      providers: [
        {
          provide: ChecklistsService,
          useValue: {
            resumenUnidades: () => of([]),
            historialUnidad: () => of([]),
          } as Partial<ChecklistsService>,
        },
        { provide: PdfExportService, useValue: {} as Partial<PdfExportService> },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    }).compileComponents();
  });

  it('prioriza CON_OBSERVACION cuando hay observaciones en historial', () => {
    const fixture = TestBed.createComponent(ChecklistSelectorComponent);
    const comp = fixture.componentInstance;
    const estado = comp.estadoHistorialFila({
      id: 1,
      carroId: 1,
      cuarteleroId: 1,
      fecha: new Date().toISOString(),
      tipo: 'UNIDAD',
      inspector: 'I',
      grupoGuardia: '1',
      firmaOficial: null,
      observaciones: 'Fuga detectada',
      totalItems: 10,
      itemsOk: 10,
      detalle: null,
      carro: { id: 1, nomenclatura: 'R-1', nombre: 'Rescate' },
      cuartelero: { id: 1, nombre: 'OBAC', rol: 'CAPITAN' },
      unidad: 'R-1',
      nombreUnidad: 'Rescate 1',
    });
    expect(estado).toBe('CON_OBSERVACION');
  });

  it('usa COMPLETADO cuando total y ok coinciden sin observaciones', () => {
    const fixture = TestBed.createComponent(ChecklistSelectorComponent);
    const comp = fixture.componentInstance;
    const estado = comp.estadoItemsEtiqueta({
      id: 1,
      unidad: 'B-1',
      nombre: 'Bomba',
      ultimaRevision: null,
      itemsTotal: 20,
      itemsOk: 20,
      itemsFaltantes: 0,
    });
    expect(estado).toBe('COMPLETADO');
  });
});
