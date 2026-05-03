import type { LogosPdfCabecera } from '../models/configuracion.dto';

export function logosActivosPorConfig(m: LogosPdfCabecera | undefined): { sidep: boolean; compania: boolean } {
  switch (m) {
    case 'NINGUNO':
      return { sidep: false, compania: false };
    case 'SIDEP':
      return { sidep: true, compania: false };
    case 'COMPANIA':
      return { sidep: false, compania: true };
    default:
      return { sidep: true, compania: true };
  }
}
