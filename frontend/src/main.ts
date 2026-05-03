import { registerLocaleData } from '@angular/common';
import localeEsCl from '@angular/common/locales/es-CL';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';

/** Sin esto, formatDate / date pipe con locale es-CL devuelven texto vacío. */
registerLocaleData(localeEsCl);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
