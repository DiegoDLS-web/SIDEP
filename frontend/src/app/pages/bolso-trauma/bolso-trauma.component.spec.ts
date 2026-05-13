import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { BolsoTraumaComponent } from './bolso-trauma.component';
import { BolsosTraumaService } from '../../services/bolsos-trauma.service';
import { PdfExportService } from '../../services/pdf-export.service';

describe('BolsoTraumaComponent (estado)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BolsoTraumaComponent],
      providers: [
        {
          provide: BolsosTraumaService,
          useValue: {
            selector: () => of([]),
            historial: () => of([]),
            obtenerHistorialPorId: () =>
              of({
                id: 1,
                carroId: 1,
                cuarteleroId: 1,
                fecha: new Date().toISOString(),
                tipo: 'TRAUMA',
                inspector: 'I',
                grupoGuardia: '1',
                firmaOficial: null,
                observaciones: null,
                totalItems: 1,
                itemsOk: 1,
                detalle: null,
                carro: { id: 1, nomenclatura: 'R-1', nombre: 'Rescate' },
                cuartelero: { id: 1, nombre: 'OBAC', rol: 'CAPITAN' },
              }),
          } as Partial<BolsosTraumaService>,
        },
        { provide: PdfExportService, useValue: {} as Partial<PdfExportService> },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    }).compileComponents();
  });

  it('etiqueta estado unificado con tilde', () => {
    const fixture = TestBed.createComponent(BolsoTraumaComponent);
    const comp = fixture.componentInstance;
    expect(
      comp.etiquetaEstado({
        id: 1,
        fecha: new Date().toISOString(),
        unidad: 'R-1',
        carroNombre: 'Rescate',
        inspector: 'I',
        responsable: 'OBAC',
        grupoGuardia: '1',
        totalItems: 10,
        itemsOk: 10,
        porcentaje: 100,
        observaciones: null,
        estadoChecklist: 'CON_OBSERVACION',
      }),
    ).toBe('Con observación');
  });
});
