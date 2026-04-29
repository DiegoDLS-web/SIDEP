import { mapLoginUsuarioASesion } from './auth-session.mapper';

describe('mapLoginUsuarioASesion', () => {
  it('mapea todos los campos de la respuesta de login', () => {
    const out = mapLoginUsuarioASesion({
      id: 42,
      nombre: 'Juan Pérez',
      rol: 'CAPITAN',
      email: 'juan@ejemplo.cl',
      rut: '12.345.678-9',
      requiereCambioPassword: true,
    });
    expect(out).toEqual({
      id: 42,
      nombre: 'Juan Pérez',
      rol: 'CAPITAN',
      email: 'juan@ejemplo.cl',
      rut: '12.345.678-9',
      activo: true,
      requiereCambioPassword: true,
    });
  });

  it('usa rut vacío y requiereCambioPassword undefined si no vienen', () => {
    const out = mapLoginUsuarioASesion({
      id: 1,
      nombre: 'Sin rut',
      rol: 'VOLUNTARIOS',
      email: null,
    });
    expect(out.rut).toBe('');
    expect(out.requiereCambioPassword).toBeUndefined();
    expect(out.activo).toBe(true);
  });
});
