import { ApplicationConfig, ErrorHandler, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  provideRouter,
  withInMemoryScrolling,
  withPreloading,
} from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { shortLivedGetCacheInterceptor } from './interceptors/short-lived-get-cache.interceptor';
import { SidSelectivePreloadStrategy } from './routing/sid-selective-preload.strategy';

import { SidGlobalErrorHandler } from './core/errors/sid-global-error-handler';

/**
 * Configuración global: locale, HTTP, router con precarga selectiva.
 * Solo rutas con data.preload se descargan en segundo plano tras el arranque.
 * Caché en memoria (TTL corto) en GET frecuentes de dashboard/analítica/planilla.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'es-CL' },
    { provide: ErrorHandler, useClass: SidGlobalErrorHandler },
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptors([authInterceptor, shortLivedGetCacheInterceptor])),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      }),
      withPreloading(SidSelectivePreloadStrategy),
    ),
  ],
};
