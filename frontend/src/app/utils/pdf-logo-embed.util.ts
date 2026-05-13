/**
 * Escala logos raster a alta resolución antes de incrustarlos en jsPDF,
 * evitando artefactos, “fantasmas” y bordes dentados al estirar PNG/JPEG en la cabecera.
 */
export type LogoPdfPreparado = {
  dataUrl: string;
  widthMm: number;
  heightMm: number;
  format: 'PNG' | 'JPEG';
};

const DPI_EMBED = 300;

/**
 * Ajusta la imagen dentro de un rectángulo máximo (mm), manteniendo proporción (contain).
 */
export async function prepararLogoParaPdf(
  dataUrl: string | null | undefined,
  maxWidthMm: number,
  maxHeightMm: number,
): Promise<LogoPdfPreparado | null> {
  if (!dataUrl?.startsWith('data:image')) {
    return null;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const nw = img.naturalWidth || img.width;
      const nh = img.naturalHeight || img.height;
      if (!nw || !nh || !Number.isFinite(nw) || !Number.isFinite(nh)) {
        resolve(null);
        return;
      }
      const ar = nw / nh;
      const boxAr = maxWidthMm / maxHeightMm;
      let wMm = maxWidthMm;
      let hMm = maxHeightMm;
      if (ar > boxAr) {
        hMm = maxWidthMm / ar;
      } else {
        wMm = maxHeightMm * ar;
      }
      const pxPerMm = DPI_EMBED / 25.4;
      const cw = Math.max(2, Math.round(wMm * pxPerMm));
      const ch = Math.max(2, Math.round(hMm * pxPerMm));
      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, cw, ch);
      /** PNG mantiene transparencia (logos sobre banda roja / cabeceras). */
      const out = canvas.toDataURL('image/png');
      resolve({
        dataUrl: out,
        widthMm: wMm,
        heightMm: hMm,
        format: 'PNG',
      });
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}
