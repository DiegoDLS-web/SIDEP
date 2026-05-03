import type { LoginResponseDto, SesionUsuarioDto } from '../../models/auth.dto';

/**
 * Mapea la respuesta de login al modelo de sesión usado en toda la app.
 * Función pura: fácil de probar y sin efectos secundarios.
 */
export function mapLoginUsuarioASesion(resp: LoginResponseDto['usuario']): SesionUsuarioDto {
  return {
    id: resp.id,
    nombre: resp.nombre,
    rol: resp.rol,
    email: resp.email,
    rut: resp.rut ?? '',
    activo: true,
    requiereCambioPassword: resp.requiereCambioPassword,
  };
}
