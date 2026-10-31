import { Injectable, inject } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { DriverSession, RuntimeConfig } from '@wattwisely/driver-core';
import { DriverAuthConfigFactory } from './driver-auth-config.factory';

/**
 * The driver app's only door to Keycloak (module 19). Charging by QR code needs no login;
 * the account pages and accepting an invitation do, and ask this service.
 */
@Injectable({ providedIn: 'root' })
export class DriverAuthService implements DriverSession {
  private readonly oauthService = inject(OAuthService);
  private readonly runtimeConfig = inject(RuntimeConfig);

  /** Runs once at start-up. Finishes a login if Keycloak just redirected back with a code. */
  async initialize(): Promise<void> {
    this.oauthService.configure(
      new DriverAuthConfigFactory().create(this.runtimeConfig, window.location.origin),
    );
    await this.oauthService.loadDiscoveryDocumentAndTryLogin();
    if (this.isLoggedIn()) {
      this.oauthService.setupAutomaticSilentRefresh();
    }
  }

  isLoggedIn(): boolean {
    return this.oauthService.hasValidAccessToken();
  }

  /** The address of the login, as Keycloak states it; empty when logged out. */
  email(): string {
    const claims = this.oauthService.getIdentityClaims() as { email?: string } | null;
    return claims?.email ?? '';
  }

  /** Sends the browser to Keycloak's login page; it comes back to the page the driver was on. */
  login(): void {
    this.oauthService.initCodeFlow();
  }

  /**
   * For an invited driver: Keycloak's login page with the address filled in, or its
   * sign-up page when `isNewAccount` is true.
   */
  loginAs(email: string, isNewAccount: boolean): void {
    const params: Record<string, string> = { login_hint: email };
    if (isNewAccount) {
      params['prompt'] = 'create';
    }
    this.oauthService.initCodeFlow('', params);
  }

  /** Ends the app session and the Keycloak session. */
  logout(): void {
    this.oauthService.logOut();
  }

  accessToken(): string {
    return this.oauthService.getAccessToken();
  }
}
