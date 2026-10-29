import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import { DriverApiInterceptor, DriverSession, RuntimeConfig } from '@wattwisely/driver-core';
import { UiProviders } from '@wattwisely/ui';
import { OAuthStorage, provideOAuthClient } from 'angular-oauth2-oidc';
import { APP_ROUTES } from './app.routes';
import { MobileAuthService } from './core/auth/mobile-auth.service';
import { AppLinks } from './core/charging/app-links';
import { PushRegistrar } from './core/notifications/push-registrar';
import { SecureTokenStore } from './core/auth/secure-token-store';

/**
 * Everything the mobile app provides at start-up (module 30). The driver API, its models and
 * the token interceptor are the driver web app's (packages/driver-core); the sign-in is the
 * app's own, through the system browser, with the tokens in the phone's secure storage.
 * Ionic draws in its iOS style on both phones, so the app looks the same as the design.
 */
export class AppConfigFactory {
  static readonly IONIC_MODE = 'ios';

  static create(runtimeConfig: RuntimeConfig): ApplicationConfig {
    return {
      providers: [
        provideBrowserGlobalErrorListeners(),
        provideIonicAngular({ mode: AppConfigFactory.IONIC_MODE }),
        { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
        provideRouter(APP_ROUTES, withComponentInputBinding()),
        provideHttpClient(withInterceptorsFromDi()),
        provideOAuthClient(),
        { provide: OAuthStorage, useExisting: SecureTokenStore },
        ...UiProviders.all(),
        { provide: RuntimeConfig, useValue: runtimeConfig },
        { provide: DriverSession, useExisting: MobileAuthService },
        { provide: HTTP_INTERCEPTORS, useClass: DriverApiInterceptor, multi: true },
        // Load the stored sign-in, and refresh it, before the first page is chosen.
        provideAppInitializer(() => inject(MobileAuthService).initialize()),
        // A plug's QR code or an invitation that opened the app goes to its page (module 32).
        provideAppInitializer(() => inject(AppLinks).listen()),
        // The phone's push token follows the sign-in; a tapped push opens its page (module 34).
        provideAppInitializer(() => inject(PushRegistrar).listen()),
      ],
    };
  }
}
