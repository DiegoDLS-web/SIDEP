export function nombreCompletoUsuario(u: {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
}): string {
  return `${u.nombres} ${u.apellidoPaterno} ${u.apellidoMaterno}`.trim();
}

export function mapUsuarioBasico(u: {
  rut: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  rol?: { nombre?: string; codigo?: string } | null;
  cargo?: { nombre?: string } | null;
} | null | undefined) {
  if (!u) return null;
  return {
    rut: u.rut,
    nombre: nombreCompletoUsuario(u),
    rol: u.rol?.nombre ?? null,
    rolCodigo: u.rol?.codigo ?? null,
    cargo: u.cargo?.nombre ?? null,
  };
}
