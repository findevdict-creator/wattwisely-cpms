import { RuntimeConfig } from '@wattwisely/driver-core';
import { AuthConfig } from 'angular-oauth2-oidc';

/**
 * OpenID Connect settings for the mobile app (module 30): Keycloak's driver client, the
 * authorization code flow with PKCE, as in the driver web app. On a phone the login opens in
 * the system browser (`openUri`) and Keycloak sends the code back to the app's own address,
 * `com.wattwisely.driver:/callback`. In a desktop browser, while developing, it comes back to
 * the page instead. `offline_access` keeps the driver signed in after Keycloak's browser
 * session ends, as an app should.
 */
export class MobileAuthConfigFactory {
  static readonly SCHEME = 'com.wattwisely.driver';
  static readonly REDIRECT_URI = `${MobileAuthConfigFactory.SCHEME}:/callback`;
  static readonly SIGNED_OUT_URI = `${MobileAuthConfigFactory.SCHEME}:/signed-out`;
  static readonly SCOPES = 'openid profile email offline_access';

  /** `openUri` opens the system browser on a phone; null in a desktop browser. */
  create(
    runtimeConfig: RuntimeConfig,
    openUri: ((uri: string) => void) | null,
    webOrigin: string,
  ): AuthConfig {
    const config: AuthConfig = {
      issuer: runtimeConfig.issuerUrl,
      clientId: runtimeConfig.keycloakClientId,
      responseType: 'code',
      scope: MobileAuthConfigFactory.SCOPES,
      redirectUri: openUri ? MobileAuthConfigFactory.REDIRECT_URI : `${webOrigin}/`,
      postLogoutRedirectUri: openUri ? MobileAuthConfigFactory.SIGNED_OUT_URI : `${webOrigin}/`,
      // Plain http is only accepted for local development (e.g. http://auth.localhost).
      requireHttps: runtimeConfig.issuerUrl.startsWith('https://'),
      useSilentRefresh: false,
      sessionChecksEnabled: false,
    };
    return openUri ? { ...config, openUri } : config;
  }
}
