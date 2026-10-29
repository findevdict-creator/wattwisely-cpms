import { expect, Page } from '@playwright/test';
import { DemoUsers } from './demo-users';
import { KeycloakLogin } from './keycloak-login';
import { StackUrls } from './stack-urls';

/**
 * The mobile app as a phone browser runs it. Keycloak rotates refresh tokens and refuses one
 * used twice, so every test signs in afresh instead of sharing a saved browser state.
 */
export class MobileApp {
  static readonly TOKEN_PREFIX = 'ww-auth.';

  constructor(private readonly page: Page) {}

  async signIn(email = DemoUsers.DANA): Promise<void> {
    await this.page.goto(`${StackUrls.MOBILE}/welcome`);
    await this.page.getByTestId('sign-in').click();
    await new KeycloakLogin(this.page).submitPassword(email, DemoUsers.PASSWORD);
    await this.page.waitForURL(/\/tabs\/home/, { timeout: 30_000 });
    await expect(this.page.getByTestId('greeting')).toBeVisible();
  }

  async open(path: string): Promise<void> {
    await this.page.goto(`${StackUrls.MOBILE}${path}`);
  }

  /** Makes the stored access token look expired, as after the phone slept for a while. */
  async expireAccessToken(): Promise<void> {
    await this.page.evaluate((prefix) => {
      localStorage.setItem(`${prefix}expires_at`, String(Date.now() - 60_000));
    }, MobileApp.TOKEN_PREFIX);
  }

  /** Replaces the refresh token with one Keycloak never issued, as after a revoked session. */
  async breakRefreshToken(): Promise<void> {
    await this.expireAccessToken();
    await this.page.evaluate((prefix) => {
      localStorage.setItem(`${prefix}refresh_token`, 'revoked');
    }, MobileApp.TOKEN_PREFIX);
  }

  async tokenKeys(): Promise<string[]> {
    return this.page.evaluate(
      (prefix) => Object.keys(localStorage).filter((key) => key.startsWith(prefix)),
      MobileApp.TOKEN_PREFIX,
    );
  }
}
