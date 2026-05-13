import {
  fechaCalendarioValida,
  mensajeErrorFechaParteSiHay,
  rangoIsoListadoPartes,
} from './partes-filtros-fecha.util';

describe('partes-filtros-fecha.util', () => {
  describe('fechaCalendarioValida', () => {
    it('acepta 1/1/2026', () => {
      expect(fechaCalendarioValida(1, 1, 2026)).toBe(true);
    });

    it('rechaza 31/02/2026', () => {
      expect(fechaCalendarioValida(31, 2, 2026)).toBe(false);
    });
  });

  describe('mensajeErrorFechaParteSiHay', () => {
    it('vacío no reporta error', () => {
      expect(mensajeErrorFechaParteSiHay('  ')).toBeNull();
    });

    it('formato incorrecto', () => {
      expect(mensajeErrorFechaParteSiHay('2026-03-10')).toContain('formato');
    });

    it('fecha imposible', () => {
      expect(mensajeErrorFechaParteSiHay('31/02/2026')).toContain('no existe');
    });
  });

  describe('rangoIsoListadoPartes', () => {
    const ref = new Date(2026, 4, 15, 14, 30, 0); // 15 mayo 2026

    it('"todos" sin fecha devuelve objeto vacío', () => {
      expect(rangoIsoListadoPartes({ filtroFechaTrim: '', filtroPeriodo: 'todos', ahora: ref })).toEqual({});
    });

    it('"hoy" usa medianoche a fin de día referencia', () => {
      const r = rangoIsoListadoPartes({ filtroFechaTrim: '', filtroPeriodo: 'hoy', ahora: ref });
      expect(r.desde).toBeDefined();
      expect(r.hasta).toBeDefined();
      const d0 = new Date(r.desde!);
      const d1 = new Date(r.hasta!);
      expect(d0.getDate()).toBe(15);
      expect(d0.getMonth()).toBe(4);
      expect(d1.getDate()).toBe(15);
      expect(d1.getHours()).toBe(23);
    });

    it('"Este mes" es mes calendario (1 al último día)', () => {
      const r = rangoIsoListadoPartes({ filtroFechaTrim: '', filtroPeriodo: 'mes', ahora: ref });
      const desde = new Date(r.desde!);
      const hasta = new Date(r.hasta!);
      expect(desde.getDate()).toBe(1);
      expect(desde.getMonth()).toBe(4);
      expect(hasta.getMonth()).toBe(4);
      expect(hasta.getDate()).toBe(31);
      expect(hasta.getHours()).toBe(23);
    });

    it('fecha válida prioriza día exacto sobre período', () => {
      const r = rangoIsoListadoPartes({
        filtroFechaTrim: '10/03/2026',
        filtroPeriodo: 'mes',
        ahora: ref,
      });
      const desde = new Date(r.desde!);
      expect(desde.getDate()).toBe(10);
      expect(desde.getMonth()).toBe(2);
    });

    it('fecha inválida con texto no establece día; aplica período', () => {
      const r = rangoIsoListadoPartes({
        filtroFechaTrim: '31/02/2026',
        filtroPeriodo: 'hoy',
        ahora: ref,
      });
      const desde = new Date(r.desde!);
      expect(desde.getDate()).toBe(15);
    });
  });
});
