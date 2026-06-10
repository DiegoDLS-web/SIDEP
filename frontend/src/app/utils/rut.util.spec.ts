import { validarRut, normalizarRut } from './rut.util';

describe('Pruebas Unitarias de Validación y Normalización de RUT', () => {
  describe('validarRut', () => {
    // Casos válidos exigidos
    it('debe aceptar el RUT válido 12.345.678-5', () => {
      expect(validarRut('12.345.678-5')).toBeTrue();
    });

    it('debe aceptar el RUT válido 11111111-1', () => {
      expect(validarRut('11111111-1')).toBeTrue();
    });

    it('debe aceptar el RUT válido 76086428-5', () => {
      expect(validarRut('76086428-5')).toBeTrue();
    });

    // Otros formatos aceptados para casos válidos (mayúsculas, minúsculas, sin puntos ni guiones)
    it('debe aceptar formatos alternativos del RUT', () => {
      expect(validarRut('123456785')).toBeTrue();
      expect(validarRut('12345678-5')).toBeTrue();
      expect(validarRut('12.345.678-5')).toBeTrue();
    });

    it('debe aceptar RUTs válidos con DV K en mayúscula o minúscula', () => {
      expect(validarRut('12345670K')).toBeTrue();
      expect(validarRut('12.345.670-k')).toBeTrue();
      expect(validarRut('12.345.670-K')).toBeTrue();
    });


    // Casos inválidos exigidos
    it('debe rechazar el RUT inválido 12.345.678-9', () => {
      expect(validarRut('12.345.678-9')).toBeFalse();
    });

    it('debe rechazar el RUT inválido 12345678-0', () => {
      expect(validarRut('12345678-0')).toBeFalse();
    });

    it('debe rechazar el RUT inválido abcdefgh-i', () => {
      expect(validarRut('abcdefgh-i')).toBeFalse();
    });

    it('debe rechazar el RUT inválido 11111111-2', () => {
      expect(validarRut('11111111-2')).toBeFalse();
    });

    // Casos adicionales de rechazo
    it('debe rechazar RUT vacíos, incompletos o caracteres inválidos', () => {
      expect(validarRut('')).toBeFalse();
      expect(validarRut('   ')).toBeFalse();
      expect(validarRut('12.345')).toBeFalse();
      expect(validarRut('12.345.678-K9')).toBeFalse();
    });
  });

  describe('normalizarRut', () => {
    it('debe normalizar RUTs a formato limpio sin puntos, guiones y con DV en mayúscula', () => {
      expect(normalizarRut('12.345.678-5')).toBe('123456785');
      expect(normalizarRut('12345678-K')).toBe('12345678K');
      expect(normalizarRut('12.345.678-k')).toBe('12345678K');
      expect(normalizarRut('12345678K')).toBe('12345678K');
    });

    it('debe retornar string vacío si el RUT no es válido', () => {
      expect(normalizarRut('')).toBe('');
      expect(normalizarRut(null as any)).toBe('');
    });
  });
});
