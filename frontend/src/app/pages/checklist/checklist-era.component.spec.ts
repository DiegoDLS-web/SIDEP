import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ChecklistEraComponent } from './checklist-era.component';
import { CarrosService } from '../../services/carros.service';
import { UsuariosService } from '../../services/usuarios.service';
import { AuthService } from '../../services/auth.service';
import { ChecklistsService } from '../../services/checklists.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { ToastService } from '../../services/toast.service';

describe('ChecklistEraComponent (estado)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChecklistEraComponent],
      providers: [
        { provide: CarrosService, useValue: { listar: () => of([]) } as Partial<CarrosService> },
        { provide: UsuariosService, useValue: { listar: () => of([]) } as Partial<UsuariosService> },
        { provide: AuthService, useValue: { usuarioActual: null } as Partial<AuthService> },
        {
          provide: ChecklistsService,
          useValue: {
            historialEraUnidad: () => of([]),
            listarChecklistEra: () => of([]),
            eraUltimosPorUnidad: () => of([]),
            eraPagina: () => of({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 1 }),
            obtenerPlantilla: () => of(null),
          } as Partial<ChecklistsService>,
        },
        { provide: PdfExportService, useValue: {} as Partial<PdfExportService> },
        { provide: ToastService, useValue: {} as Partial<ToastService> },
      ],
    }).compileComponents();
  });

  it('muestra etiqueta Con observación cuando estadoChecklist viene desde backend', () => {
    const fixture = TestBed.createComponent(ChecklistEraComponent);
    const comp = fixture.componentInstance;
    const texto = comp.etiquetaEstadoEraTexto({
      id: 10,
      carroId: 1,
      cuarteleroId: 1,
      fecha: new Date().toISOString(),
      tipo: 'ERA',
      inspector: 'I',
      grupoGuardia: '1',
      firmaOficial: null,
      observaciones: null,
      totalItems: 8,
      itemsOk: 8,
      detalle: null,
      estadoChecklist: 'CON_OBSERVACION',
      carro: { id: 1, nomenclatura: 'R-1', nombre: 'Rescate' },
      cuartelero: { id: 1, nombre: 'OBAC', rol: 'CAPITAN' },
    });
    expect(texto).toBe('Con observación');
  });
});
