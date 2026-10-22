import { Injectable, inject } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { RuntimeConfig } from '../config/runtime-config';
import { AuthConfigFactory } from './auth-config.factory';

/**
 * The portal's only door to Keycloak. Everything else asks this service
 * whether the user is logged in, for the access token, or to log in or out.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly oauthService = inject(OAuthService);
  private readonly runtimeConfig = inject(RuntimeConfig);

  /** Runs once at start-up. Finishes a login if Keycloak just redirected back with a code. */
  async initialize(): Promise<void> {
    this.oauthService.configure(
      new AuthConfigFactory().create(this.runtimeConfig, window.location.origin),
    );
    await this.oauthService.loadDiscoveryDocumentAndTryLogin();
    if (this.isLoggedIn()) {
      this.oauthService.setupAutomaticSilentRefresh();
    }
  }

  isLoggedIn(): boolean {
    return this.oauthService.hasValidAccessToken();
  }

  /** Sends the browser to Keycloak's login page; it comes back to `returnUrl`. */
  login(returnUrl: string): void {
    this.oauthService.initCodeFlow(returnUrl);
  }

  /**
   * For people invited by e-mail: Keycloak's login page with the address filled in,
   * or its sign-up page when `isNewAccount` is true.
   */
  loginAs(email: string, isNewAccount: boolean): void {
    const params: Record<string, string> = { login_hint: email };
    if (isNewAccount) {
      params['prompt'] = 'create';
    }
    this.oauthService.initCodeFlow('', params);
  }

  /** Ends the portal session and the Keycloak session. */
  logout(): void {
    this.oauthService.logOut();
  }

  accessToken(): string {
    return this.oauthService.getAccessToken();
  }
}
