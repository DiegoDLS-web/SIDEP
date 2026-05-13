import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { tap } from 'rxjs/operators';

const TTL_MS = 20_000;

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

/** POST/PATCH/DELETE/PUT sobre partes (lista, detalle o raíz). */
function esMutacionPartes(rutaSinQuery: string): boolean {
  if (!/^\/api\/partes\b/.test(rutaSinQuery)) {
    return false;
  }
  return !rutaSinQuery.endsWith('/metricas') && !rutaSinQuery.endsWith('/pagina');
}

function debeCachearse(urlCompleto: string): boolean {
  const p = pathSinQuery(urlCompleto);
  return p.endsWith('/api/partes/metricas') || p.includes('/api/dashboard/resumen');
}

function invalidarCachesPartesYDashboard(): void {
  const keys = [...cache.keys()];
  for (const k of keys) {
    const p = pathSinQuery(k);
    if (p.endsWith('/api/partes/metricas') || p.includes('/api/dashboard/resumen')) {
      cache.delete(k);
    }
  }
}

/**
 * GET con TTL corto: métricas de partes, resumen dashboard.
 * Invalidación al crear/actualizar un parte.
 */
export const shortLivedGetCacheInterceptor: HttpInterceptorFn = (req, next) => {
  const url = req.url;
  const rutaBase = pathSinQuery(url);

  if (req.method !== 'GET' && esMutacionPartes(rutaBase)) {
    invalidarCachesPartesYDashboard();
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
