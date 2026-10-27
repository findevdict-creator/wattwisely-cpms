import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { UiProviders } from '@wattwisely/ui';
import { provideOAuthClient } from 'angular-oauth2-oidc';
import { APP_ROUTES } from './app.routes';
import { DriverApiInterceptor } from './core/auth/driver-api.interceptor';
import { DriverAuthService } from './core/auth/driver-auth.service';
import { RuntimeConfig } from './core/config/runtime-config';

/**
 * Everything the driver app provides at start-up. Charging needs no login: the charge key in
 * the URL is the proof. The account pages (module 19) do, through Keycloak's driver client.
 */
export class AppConfigFactory {
  static create(runtimeConfig: RuntimeConfig): ApplicationConfig {
    return {
      providers: [
        provideBrowserGlobalErrorListeners(),
        provideRouter(APP_ROUTES, withComponentInputBinding()),
        provideHttpClient(withInterceptorsFromDi()),
        provideOAuthClient(),
        ...UiProviders.all(),
        { provide: RuntimeConfig, useValue: runtimeConfig },
        { provide: HTTP_INTERCEPTORS, useClass: DriverApiInterceptor, multi: true },
        // Finish a pending Keycloak login before the first page is shown.
        provideAppInitializer(() => inject(DriverAuthService).initialize()),
      ],
    };
  }
}
