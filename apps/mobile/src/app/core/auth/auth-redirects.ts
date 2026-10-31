import { MobileAuthConfigFactory } from './mobile-auth-config.factory';

/** Reads the links that bring the phone back to the app from Keycloak's pages. */
export class AuthRedirects {
  static isCallback(url: string): boolean {
    return url.startsWith(MobileAuthConfigFactory.REDIRECT_URI);
  }

  static isSignedOut(url: string): boolean {
    return url.startsWith(MobileAuthConfigFactory.SIGNED_OUT_URI);
  }

  /** The callback's query, "?code=…&state=…", in the form the sign-in library reads it. */
  static query(url: string): string {
    const start = url.indexOf('?');
    return start < 0 ? '' : url.slice(start);
  }
}
