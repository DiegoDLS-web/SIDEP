import { calcularEstadoChecklist, etiquetaEstadoChecklist } from './checklist-estado';

describe('checklist-estado utils', () => {
  describe('calcularEstadoChecklist', () => {
    it('retorna CON_OBSERVACION cuando hay observaciones', () => {
      expect(calcularEstadoChecklist(10, 10, 'Detalle encontrado')).toBe('CON_OBSERVACION');
    });

    it('retorna COMPLETADO cuando cumple todos los items y sin observaciones', () => {
      expect(calcularEstadoChecklist(10, 10, '')).toBe('COMPLETADO');
    });

    it('retorna PENDIENTE cuando no cumple todos los items', () => {
      expect(calcularEstadoChecklist(10, 7, null)).toBe('PENDIENTE');
    });

    it('retorna PENDIENTE cuando total es 0 y no hay observaciones', () => {
      expect(calcularEstadoChecklist(0, 0, undefined)).toBe('PENDIENTE');
    });
  });

  describe('etiquetaEstadoChecklist', () => {
    it('devuelve etiquetas con tildes y formato final', () => {
      expect(etiquetaEstadoChecklist('COMPLETADO')).toBe('Completado');
      expect(etiquetaEstadoChecklist('PENDIENTE')).toBe('Pendiente');
      expect(etiquetaEstadoChecklist('CON_OBSERVACION')).toBe('Con observación');
    });
  });
});
