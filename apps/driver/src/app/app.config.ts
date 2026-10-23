import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { APP_ROUTES } from './app.routes';
import { RuntimeConfig } from './core/config/runtime-config';

/** Everything the driver app provides at start-up. No login: the charge key in the URL is the proof. */
export class AppConfigFactory {
  static create(runtimeConfig: RuntimeConfig): ApplicationConfig {
    return {
      providers: [
        provideBrowserGlobalErrorListeners(),
        provideRouter(APP_ROUTES, withComponentInputBinding()),
        provideHttpClient(),
        { provide: RuntimeConfig, useValue: runtimeConfig },
      ],
    };
  }
}
