import { AuthConfig } from 'angular-oauth2-oidc';
import { RuntimeConfig } from '../config/runtime-config';

/**
 * OpenID Connect settings for Keycloak's driver client (module 19): authorization code flow
 * with PKCE, like the portal's. The client is public, so there is no secret; Keycloak gives
 * it the driver login flow, which asks for an authenticator app only when the driver set one up.
 */
export class DriverAuthConfigFactory {
  static readonly SCOPES = 'openid profile email';

  create(runtimeConfig: RuntimeConfig, origin: string): AuthConfig {
    return {
      issuer: runtimeConfig.issuerUrl,
      clientId: runtimeConfig.keycloakClientId,
      responseType: 'code',
      scope: DriverAuthConfigFactory.SCOPES,
      redirectUri: `${origin}/`,
      postLogoutRedirectUri: `${origin}/`,
      // Plain http is only accepted for local development (e.g. http://auth.localhost).
      requireHttps: runtimeConfig.issuerUrl.startsWith('https://'),
      // Back to the invitation or the page the driver asked for once Keycloak returns.
      preserveRequestedRoute: true,
      useSilentRefresh: false,
      sessionChecksEnabled: false,
    };
  }
}
