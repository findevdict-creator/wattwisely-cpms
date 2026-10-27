import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideOAuthClient } from 'angular-oauth2-oidc';
import { APP_ROUTES } from './app.routes';
import { ApiAuthInterceptor } from './core/auth/api-auth.interceptor';
import { AuthService } from './core/auth/auth.service';
import { RuntimeConfig } from './core/config/runtime-config';

/** Everything the admin console provides at start-up. */
export class AppConfigFactory {
  static create(runtimeConfig: RuntimeConfig): ApplicationConfig {
    return {
      providers: [
        provideBrowserGlobalErrorListeners(),
        provideRouter(APP_ROUTES, withComponentInputBinding()),
        provideHttpClient(withInterceptorsFromDi()),
        provideOAuthClient(),
        { provide: RuntimeConfig, useValue: runtimeConfig },
        { provide: HTTP_INTERCEPTORS, useClass: ApiAuthInterceptor, multi: true },
        // Finish a pending Keycloak login before the first page is shown.
        provideAppInitializer(() => inject(AuthService).initialize()),
      ],
    };
  }
}
