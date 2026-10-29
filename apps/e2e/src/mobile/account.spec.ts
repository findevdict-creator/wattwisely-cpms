import { expect, test } from '@playwright/test';
import { MobileApp } from '../support/mobile-app';

// Module 33 (the account pages of the mobile app) and module 34 (notification settings).
test.describe('Mobile app: account', () => {
  test.beforeEach(async ({ page }) => {
    await new MobileApp(page).signIn();
  });

  test('the Account tab shows who is signed in', { tag: ['@module-33'] }, async ({ page }) => {
    await new MobileApp(page).open('/tabs/account');
    await expect(page.getByTestId('email')).toContainText('dana@acme.test');
    await expect(page.getByTestId('sign-out')).toBeVisible();
  });

  test(
    'My operators lists Acme Charging with what it holds',
    { tag: ['@module-33'] },
    async ({ page }) => {
      await new MobileApp(page).open('/account/operators');
      await page.getByText('Acme Charging').first().click();
      await expect(page.locator('body')).toContainText('Van key fob');
    },
  );

  test(
    'payment methods explain that cards are kept by Stripe',
    { tag: ['@module-33', '@module-6'] },
    async ({ page }) => {
      await new MobileApp(page).open('/account/cards');
      await expect(page.locator('body')).toContainText('Cards are stored by Stripe');
    },
  );

  // Saving is a PATCH to /v1/driver/me, which the API's CORS preflight does not allow (finding F1).
  test('personal details save a new phone number', { tag: ['@module-33'] }, async ({ page }) => {
    await new MobileApp(page).open('/account/details');
    await page.locator('[data-testid="phone"] input').fill('+44 7700 900999');
    await page.getByTestId('save').click();
    await expect(page.getByTestId('saved')).toBeVisible();
    await expect(page.getByTestId('error')).toHaveCount(0);
  });

  test(
    'notification settings list the events and channels',
    { tag: ['@module-34'] },
    async ({ page }) => {
      await new MobileApp(page).open('/account/notifications');
      await expect(page.getByTestId('events')).toBeVisible();
      await expect(page.getByTestId('channels')).toBeVisible();
      await expect(page.getByTestId('error')).toHaveCount(0);
    },
  );

  test(
    'privacy downloads everything held about Dana as JSON',
    { tag: ['@module-33'] },
    async ({ page }) => {
      await new MobileApp(page).open('/account/privacy');
      await expect(page.getByTestId('operators')).toContainText('Acme Charging');
      const download = page.waitForEvent('download');
      await page.getByTestId('download-data').click();
      expect((await download).suggestedFilename()).toMatch(/\.json$/);
    },
  );

  test(
    'signing out returns to the welcome page and forgets the tokens',
    { tag: ['@module-30', '@module-33'] },
    async ({ page }) => {
      const app = new MobileApp(page);
      await app.open('/tabs/account');
      await page.getByTestId('sign-out').click();
      const confirm = page.getByRole('button', { name: /^Sign out$/ });
      if (await confirm.isVisible().catch(() => false)) {
        await confirm.click();
      }
      await expect(page).toHaveURL(/welcome|auth\.localhost/, { timeout: 30_000 });
      expect(await app.tokenKeys()).not.toContain('ww-auth.access_token');
    },
  );
});
