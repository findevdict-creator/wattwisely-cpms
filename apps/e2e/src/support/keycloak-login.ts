import { expect, Page } from '@playwright/test';
import { DemoUsers } from './demo-users';
import { OtpSecrets } from './otp-secrets';
import { StackUrls } from './stack-urls';
import { Totp } from './totp';

/**
 * Signs in through the real Keycloak pages (module 1, themed in module 21): the password, then
 * the authenticator set-up on a staff user's first login, or the six-digit code afterwards.
 */
export class KeycloakLogin {
  constructor(private readonly page: Page) {}

  /** Opens the app at `appUrl`, signs in on Keycloak's page and waits to be back on the app. */
  async signIn(appUrl: string, email: string, password = DemoUsers.PASSWORD): Promise<void> {
    await this.page.goto(appUrl);
    await this.submitPassword(email, password);
    await this.answerSecondFactor(email);
    await this.page.waitForURL((url) => !url.href.startsWith(StackUrls.KEYCLOAK), {
      timeout: 30_000,
    });
  }

  async submitPassword(email: string, password: string): Promise<void> {
    await this.page.locator('#username').waitFor({ timeout: 30_000 });
    await this.page.locator('#username').fill(email);
    await this.page.locator('#password').fill(password);
    await this.page.locator('#kc-login').click();
  }

  /** The set-up form, the code form, or nothing (a driver, or Keycloak already knows the browser). */
  async answerSecondFactor(email: string): Promise<void> {
    const setUp = this.page.locator('#totpSecret');
    const code = this.page.locator('input#otp');
    const prompt = await Promise.race([
      setUp.waitFor({ state: 'attached', timeout: 15_000 }).then(() => 'set-up'),
      code.waitFor({ timeout: 15_000 }).then(() => 'code'),
      this.page
        .waitForURL((url) => !url.href.startsWith(StackUrls.KEYCLOAK), { timeout: 15_000 })
        .then(() => 'none'),
    ]).catch(() => 'none');
    if (prompt === 'set-up') {
      await this.setUpAuthenticator(email);
    } else if (prompt === 'code') {
      await this.enterCode(email);
    }
  }

  async setUpAuthenticator(email: string): Promise<void> {
    const secret = await this.page.locator('#totpSecret').inputValue();
    OtpSecrets.put(email, secret);
    await this.page.locator('#totp').fill(await Totp.freshCode(secret));
    await this.page.locator('#saveTOTPBtn').click();
  }

  async enterCode(email: string): Promise<void> {
    const secret = OtpSecrets.get(email);
    expect(
      secret,
      `No authenticator secret saved for ${email}; run the setup project first`,
    ).toBeTruthy();
    await this.page.locator('input#otp').fill(await Totp.freshCode(secret as string));
    await this.page.locator('#kc-login').click();
  }
}
