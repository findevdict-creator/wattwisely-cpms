import { AuthConfig } from 'angular-oauth2-oidc';
import { RuntimeConfig } from '../config/runtime-config';

/**
 * OpenID Connect settings for Keycloak: authorization code flow with PKCE.
 * The portal is a public client, so it holds no secret; PKCE proves that the
 * app that started the login is the one that finishes it.
 */
export class AuthConfigFactory {
  // Tenants and roles come from the Wattwisely database (GET /v1/me), not from the token.
  static readonly SCOPES = 'openid profile email';

  create(runtimeConfig: RuntimeConfig, origin: string): AuthConfig {
    return {
      issuer: runtimeConfig.issuerUrl,
      clientId: runtimeConfig.keycloakClientId,
      responseType: 'code',
      scope: AuthConfigFactory.SCOPES,
      redirectUri: `${origin}/`,
      postLogoutRedirectUri: `${origin}/`,
      // Plain http is only accepted for local development (e.g. http://auth.localhost).
      requireHttps: runtimeConfig.issuerUrl.startsWith('https://'),
      // Return to the page the user asked for before being sent to the login page.
      preserveRequestedRoute: true,
      // Tokens are renewed with the refresh token; no hidden iframe is used.
      useSilentRefresh: false,
      sessionChecksEnabled: false,
    };
  }
}
