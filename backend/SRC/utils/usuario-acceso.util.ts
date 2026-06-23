/** Usuario mínimo para validar acceso a SIDEP. */
export type UsuarioAccesoSnapshot = {
  activo: number;
  estadoVoluntario?: { codigo?: string | null; nombre?: string | null } | null;
  observacionesRegistro?: string | null;
};

export const CODIGO_ACCESO_USUARIO_INACTIVO = 'USUARIO_INACTIVO';

export function puedeAccederApp(usuario: UsuarioAccesoSnapshot): boolean {
  if (usuario.activo !== 1) return false;
  const codigo = (usuario.estadoVoluntario?.codigo ?? '').trim().toUpperCase();
  return codigo !== 'INACTIVO';
}

export function etiquetaEstadoAcceso(usuario: UsuarioAccesoSnapshot): string {
  const codigo = (usuario.estadoVoluntario?.codigo ?? '').trim().toUpperCase();
  if (codigo === 'INACTIVO') {
    return usuario.estadoVoluntario?.nombre?.trim() || 'Inactivo / de baja';
  }
  if (usuario.activo !== 1) return 'Cuenta desactivada';
  return usuario.estadoVoluntario?.nombre?.trim() || 'Vigente';
}

export function mensajeAccesoDenegado(usuario: UsuarioAccesoSnapshot): string {
  const estado = etiquetaEstadoAcceso(usuario);
  const obs = (usuario.observacionesRegistro ?? '').trim();
  let msg = `Tu acceso a SIDEP está restringido (${estado}).`;
  if (obs) {
    msg += ` Motivo registrado: ${obs}`;
  } else {
    msg += ' Contacta a la oficialidad o administración para más información.';
  }
  return msg;
}

export function payloadAccesoDenegado(usuario: UsuarioAccesoSnapshot) {
  return {
    success: false as const,
    codigo: CODIGO_ACCESO_USUARIO_INACTIVO,
    message: mensajeAccesoDenegado(usuario),
    estadoVoluntario: etiquetaEstadoAcceso(usuario),
    observaciones: (usuario.observacionesRegistro ?? '').trim() || null,
  };
}
