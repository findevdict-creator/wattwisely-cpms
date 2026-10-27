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
import { ApiAuthInterceptor } from './core/auth/api-auth.interceptor';
import { AuthService } from './core/auth/auth.service';
import { RuntimeConfig } from './core/config/runtime-config';
import { TenantLostInterceptor } from './core/tenant/tenant-lost.interceptor';

/** Everything the portal provides at start-up. */
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
        { provide: HTTP_INTERCEPTORS, useClass: ApiAuthInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: TenantLostInterceptor, multi: true },
        // Finish a pending Keycloak login before the first page is shown.
        provideAppInitializer(() => inject(AuthService).initialize()),
      ],
    };
  }
}
