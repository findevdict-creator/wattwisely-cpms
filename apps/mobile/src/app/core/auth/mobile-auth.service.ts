import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { DriverSession, RuntimeConfig } from '@wattwisely/driver-core';
import { OAuthService } from 'angular-oauth2-oidc';
import { NativeApp } from '../native/native-app';
import { NativeBrowser } from '../native/native-browser';
import { NativePlatform } from '../native/native-platform';
import { AuthRedirects } from './auth-redirects';
import { MobileAuthConfigFactory } from './mobile-auth-config.factory';
import { SecureTokenStore } from './secure-token-store';

/**
 * The mobile app's only door to Keycloak (module 30). The driver signs in once in the
 * system browser; the tokens live in the phone's secure storage and are refreshed when they
 * run out, also when the app comes back to the foreground.
 */
@Injectable({ providedIn: 'root' })
export class MobileAuthService implements DriverSession {
  private readonly oauthService = inject(OAuthService);
  private readonly runtimeConfig = inject(RuntimeConfig);
  private readonly tokenStore = inject(SecureTokenStore);
  private readonly nativeApp = inject(NativeApp);
  private readonly browser = inject(NativeBrowser);
  private readonly platform = inject(NativePlatform);

  /** Whether the app holds a sign-in, valid or refreshable; the pages follow it. */
  readonly hasSession = signal(false);

  /** Runs once at start-up, before the first page. Never fails: offline, the app still opens. */
  async initialize(): Promise<void> {
    await this.tokenStore.load();
    const isNative = this.platform.isNative();
    const openUri = isNative ? (uri: string) => this.browser.open(uri) : null;
    this.oauthService.configure(
      new MobileAuthConfigFactory().create(this.runtimeConfig, openUri, window.location.origin),
    );
    this.nativeApp.onUrlOpen((url) => void this.handleUrl(url));
    this.nativeApp.onResume(() => void this.refreshIfNeeded());
    try {
      await this.oauthService.loadDiscoveryDocument();
      if (!isNative) {
        await this.oauthService.tryLoginCodeFlow();
      }
      await this.refreshIfNeeded();
      this.oauthService.setupAutomaticSilentRefresh();
    } catch (error) {
      console.warn('Could not reach the sign-in server', error);
    }
    this.update();
  }

  /** A link that opened the app: Keycloak's answer to a sign-in or a sign-out. */
  async handleUrl(url: string): Promise<void> {
    if (AuthRedirects.isSignedOut(url)) {
      await this.browser.close();
      return;
    }
    if (!AuthRedirects.isCallback(url)) {
      return;
    }
    await this.browser.close();
    await this.oauthService.tryLoginCodeFlow({
      customHashFragment: AuthRedirects.query(url),
      preventClearHashAfterLogin: true,
    });
    this.update();
  }

  /** Keycloak's sign-in page, or its sign-up page for "Create account". */
  login(isNewAccount = false): void {
    this.oauthService.initCodeFlow('', isNewAccount ? { prompt: 'create' } : {});
  }

  /** Forgets the tokens here and ends the Keycloak session in the browser sheet. */
  logout(): void {
    this.oauthService.logOut();
    this.update();
  }

  isLoggedIn(): boolean {
    return this.oauthService.hasValidAccessToken();
  }

  accessToken(): string {
    return this.oauthService.getAccessToken();
  }

  /** A refresh refused by Keycloak (the session was ended) signs the driver out here too. */
  private async refreshIfNeeded(): Promise<void> {
    if (this.oauthService.hasValidAccessToken() || !this.oauthService.getRefreshToken()) {
      return this.update();
    }
    try {
      await this.oauthService.refreshToken();
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 400) {
        this.oauthService.logOut(true);
      }
    }
    this.update();
  }

  private update(): void {
    this.hasSession.set(
      this.oauthService.hasValidAccessToken() || !!this.oauthService.getRefreshToken(),
    );
  }
}
