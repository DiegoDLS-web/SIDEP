import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { tap } from 'rxjs/operators';

const TTL_MS = 45_000;

type Entry = { at: number; body: unknown };

const cache = new Map<string, Entry>();

function pathSinQuery(url: string): string {
  const noHash = url.split('#')[0] ?? url;
  const noQuery = noHash.split('?')[0] ?? noHash;
  try {
    if (/^https?:\/\//i.test(noQuery)) {
      return new URL(noQuery).pathname;
    }
  } catch {
    /* relativo */
  }
  return noQuery;
}

function debeCachearse(urlCompleto: string): boolean {
  const p = pathSinQuery(urlCompleto);
  return (
    p.endsWith('/api/operaciones/partes/metricas') ||
    p.endsWith('/api/partes/metricas') ||
    p.includes('/api/dashboard/resumen') ||
    p.includes('/api/analitica/') ||
    p.endsWith('/api/asistencia-cuarteleros/planilla') ||
    p.endsWith('/api/asistencia-cuarteleros/resumen') ||
    /\/api\/carros\/?$/.test(p) ||
    p.includes('/api/catalogo')
  );
}

function esMutacionInvalidante(rutaSinQuery: string, method: string): boolean {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return false;
  return (
    /^\/api\/(?:operaciones\/)?partes\b/.test(rutaSinQuery) ||
    /^\/api\/asistencia-cuarteleros\b/.test(rutaSinQuery) ||
    /^\/api\/carros\b/.test(rutaSinQuery) ||
    /^\/api\/inventario/.test(rutaSinQuery) ||
    /^\/api\/checklist/.test(rutaSinQuery)
  );
}

function invalidarCachesRelacionados(rutaSinQuery: string): void {
  const keys = [...cache.keys()];
  for (const k of keys) {
    const p = pathSinQuery(k);
    const afectaPartes =
      /^\/api\/(?:operaciones\/)?partes\b/.test(rutaSinQuery) &&
      (p.endsWith('/api/operaciones/partes/metricas') ||
        p.endsWith('/api/partes/metricas') ||
        p.includes('/api/dashboard/resumen') ||
        p.includes('/api/analitica/'));
    const afectaAsistencia =
      /^\/api\/asistencia-cuarteleros\b/.test(rutaSinQuery) &&
      (p.endsWith('/api/asistencia-cuarteleros/planilla') ||
        p.endsWith('/api/asistencia-cuarteleros/resumen') ||
        p.includes('/api/dashboard/resumen'));
    const afectaCarros =
      (/^\/api\/carros\b/.test(rutaSinQuery) ||
        /^\/api\/checklist/.test(rutaSinQuery) ||
        /^\/api\/inventario/.test(rutaSinQuery)) &&
      (p.includes('/api/dashboard/resumen') ||
        p.includes('/api/analitica/') ||
        /\/api\/carros\/?$/.test(p));
    if (afectaPartes || afectaAsistencia || afectaCarros) {
      cache.delete(k);
    }
  }
}

/**
 * GET con TTL corto para endpoints de lectura frecuentes.
 * Invalidación selectiva ante mutaciones relacionadas.
 */
export const shortLivedGetCacheInterceptor: HttpInterceptorFn = (req, next) => {
  const url = req.url;
  const rutaBase = pathSinQuery(url);

  if (esMutacionInvalidante(rutaBase, req.method)) {
    invalidarCachesRelacionados(rutaBase);
  }

  if (req.method !== 'GET' || !debeCachearse(url)) {
    return next(req);
  }

  const clave = req.urlWithParams;
  const entrada = cache.get(clave);
  const ahora = Date.now();
  if (entrada && ahora - entrada.at < TTL_MS) {
    return of(new HttpResponse({ status: 200, body: entrada.body, url: req.url }));
  }

  return next(req).pipe(
    tap({
      next: (ev) => {
        if (ev instanceof HttpResponse) {
          cache.set(clave, { at: Date.now(), body: ev.body });
        }
      },
    }),
  );
};
