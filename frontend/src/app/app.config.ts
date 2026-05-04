import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  PreloadAllModules,
  provideRouter,
  withInMemoryScrolling,
  withPreloading,
} from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { shortLivedGetCacheInterceptor } from './interceptors/short-lived-get-cache.interceptor';

/**
 * Configuración global: locale, HTTP, router con precarga de rutas lazy.
 * PreloadAllModules descarga en segundo plano el resto de chunks tras el arranque.
 * Caché en memoria (TTL corto) en GET de métricas de partes y resumen dashboard.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'es-CL' },
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptors([authInterceptor, shortLivedGetCacheInterceptor])),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      }),
      withPreloading(PreloadAllModules),
    ),
  ],
};
