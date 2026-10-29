import { expect, test } from '@playwright/test';
import { AuthStates } from '../support/auth-states';
import { DemoUsers } from '../support/demo-users';
import { KeycloakLogin } from '../support/keycloak-login';
import { Mailpit } from '../support/mailpit';
import { StackUrls } from '../support/stack-urls';

// Module 1 (login with Keycloak, tenant selection) and module 21 (the themed sign-in pages).
test.describe('Sign-in and workspaces', () => {
  test(
    'an Owner signs in with password and authenticator code and lands on Home',
    { tag: ['@module-1', '@module-21'] },
    async ({ page }) => {
      await new KeycloakLogin(page).signIn(StackUrls.PORTAL, DemoUsers.OWNER);
      await expect(page.getByText(/Good (morning|afternoon|evening), Olivia/)).toBeVisible();
      await expect(page.getByText('Acme Charging · Owner')).toBeVisible();
    },
  );

  test(
    'the sign-in page is themed and refuses a wrong password',
    { tag: ['@module-1', '@module-21'] },
    async ({ page }) => {
      await page.goto(StackUrls.PORTAL);
      await expect(page).toHaveTitle(/Wattwisely/);
      await new KeycloakLogin(page).submitPassword(DemoUsers.NOBODY, 'not-the-password');
      await expect(page.getByText(/e-mail and password don't match/i)).toBeVisible();
      await expect(page.locator('#username')).toBeVisible();
    },
  );

  test(
    'forgot password sends a reset e-mail',
    { tag: ['@module-1', '@module-21'] },
    async ({ page }) => {
      const since = new Date();
      await page.goto(StackUrls.PORTAL);
      await page.getByRole('link', { name: /Forgot password/i }).click();
      await page.locator('#username').fill(DemoUsers.NOBODY);
      await page.locator('input[type=submit], button[type=submit]').first().click();
      await expect(page.getByText(/e-?mail/i).first()).toBeVisible();
      const mail = await Mailpit.waitFor(DemoUsers.NOBODY, '', since);
      expect(await Mailpit.text(mail.ID)).toMatch(/reset|password/i);
    },
  );

  test(
    'a user in no company sees the no-workspace page',
    { tag: ['@module-1'] },
    async ({ browser }) => {
      const context = await browser.newContext({
        storageState: AuthStates.of('portal', DemoUsers.NOBODY),
      });
      const page = await context.newPage();
      await page.goto(StackUrls.PORTAL);
      await expect(page).toHaveURL(/no-workspace/);
      await expect(page.getByText(/workspace|company/i).first()).toBeVisible();
      await context.close();
    },
  );

  test(
    'a member of two companies picks one and can switch to the other',
    { tag: ['@module-1', '@module-22'] },
    async ({ browser }) => {
      const context = await browser.newContext({
        storageState: AuthStates.of('portal', DemoUsers.MULTI),
      });
      const page = await context.newPage();
      await page.goto(`${StackUrls.PORTAL}/select-tenant`);
      await expect(page.getByText('Acme Charging').first()).toBeVisible();
      await expect(page.getByText('Volt Hotels').first()).toBeVisible();
      await page.getByText('Volt Hotels').first().click();
      await expect(page.getByText(/Volt Hotels · Owner/)).toBeVisible();
      await context.close();
    },
  );

  test(
    'a Technician sees only the site they work on and no Team page',
    { tag: ['@module-2', '@module-3'] },
    async ({ browser }) => {
      const context = await browser.newContext({
        storageState: AuthStates.of('portal', DemoUsers.TECH),
      });
      const page = await context.newPage();
      await page.goto(`${StackUrls.PORTAL}/sites`);
      await expect(page.getByText('Riverside Car Park').first()).toBeVisible();
      await expect(page.getByText('Depot North')).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Team' })).toHaveCount(0);
      await context.close();
    },
  );
});
