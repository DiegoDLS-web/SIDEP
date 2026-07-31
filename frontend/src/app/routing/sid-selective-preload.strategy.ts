import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

/**
 * Precarga solo rutas marcadas con data.preload, con un pequeño delay
 * para no competir con el arranque inicial (mejor que PreloadAllModules).
 */
@Injectable({ providedIn: 'root' })
export class SidSelectivePreloadStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    if (route.data?.['preload'] === true) {
      return timer(1200).pipe(mergeMap(() => load()));
    }
    return of(null);
  }
}
