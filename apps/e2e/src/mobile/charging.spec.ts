import { expect, test } from '@playwright/test';
import { ChargerProcess } from '../support/charger-process';
import { DemoUsers } from '../support/demo-users';
import { MobileApp } from '../support/mobile-app';

// Module 30 (the mobile shell), module 32 (charging from the app) and module 35 (nearby sites),
// in a phone-sized browser. Native-only parts (camera, push, the system browser) are in the
// Maestro flows under apps/e2e/maestro.
test.describe('Mobile app: signing in and charging', () => {
  test(
    'the welcome page signs Dana in and the home tab greets her',
    { tag: ['@module-30'] },
    async ({ page }) => {
      const app = new MobileApp(page);
      await app.signIn();
      await expect(page.getByTestId('greeting')).toContainText('Dana');
      await expect(page.getByTestId('operators')).toContainText('Acme Charging');
      expect(await app.tokenKeys()).toEqual(
        expect.arrayContaining(['ww-auth.access_token', 'ww-auth.refresh_token']),
      );
    },
  );

  test(
    'an expired access token is refreshed when the app opens again',
    { tag: ['@module-30'] },
    async ({ page }) => {
      const app = new MobileApp(page);
      await app.signIn();
      await app.expireAccessToken();
      await app.open('/tabs/sessions');
      await expect(page.getByTestId('session').first()).toBeVisible();
      await expect(page.getByTestId('error')).toHaveCount(0);
    },
  );

  test(
    'a refused refresh token sends the driver back to the welcome page',
    { tag: ['@module-30'] },
    async ({ page }) => {
      // Keycloak answers 400 invalid_grant and the app forgets its tokens; the driver should then
      // see the welcome page rather than a home tab whose next request fails.
      const app = new MobileApp(page);
      await app.signIn();
      await app.breakRefreshToken();
      await app.open('/tabs/home');
      await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });
    },
  );

  test(
    'a plug code typed on the Charge tab opens the plug with its prices',
    { tag: ['@module-32'] },
    async ({ page }) => {
      const app = new MobileApp(page);
      await app.signIn();
      await app.open('/tabs/charge');
      await page.getByTestId('type').click();
      const code = page.getByTestId('code').locator('input').first();
      await code.fill(`${DemoUsers.RIVERSIDE_CHARGER}/1`);
      await code.press('Enter');
      await expect(page).toHaveURL(new RegExp(`/plug/${DemoUsers.RIVERSIDE_CHARGER}/1`));
      await expect(page.getByTestId('site')).toContainText('Riverside Car Park');
      await expect(page.locator('body')).toContainText('£0.40');
    },
  );

  test('an offline plug says why it cannot start', { tag: ['@module-32'] }, async ({ page }) => {
    const app = new MobileApp(page);
    await app.signIn();
    await app.open(`/plug/${DemoUsers.RIVERSIDE_SECOND_CHARGER}/1`);
    await expect(page.getByTestId('availability')).toContainText(/offline/i);
    await expect(page.getByTestId('start')).toHaveCount(0);
  });

  test(
    'Dana starts a charge from the plug, watches it live and stops it',
    { tag: ['@module-32'] },
    async ({ page }) => {
      test.setTimeout(180_000);
      const charger = new ChargerProcess(DemoUsers.DEPOT_CHARGER);
      await charger.start();
      try {
        const app = new MobileApp(page);
        await app.signIn();
        await app.open(`/plug/${DemoUsers.DEPOT_CHARGER}/1`);
        await expect(page.getByTestId('availability')).toContainText(/available/i, {
          timeout: 30_000,
        });
        await expect(page.getByTestId('access')).toContainText(/free/i);
        await page.getByTestId('start').click();
        await expect(page).toHaveURL(/\/charges\//, { timeout: 30_000 });
        await charger.waitForLog(/connector 1: \d+ Wh/, 45_000);
        await expect(page.getByTestId('energy')).toBeVisible();
        await page.getByTestId('stop').click();
        await charger.waitForLog(/transaction \d+ stopped[\s\S]*connector 1: Available/, 45_000);
        await expect(page.getByTestId('done')).toBeVisible({ timeout: 90_000 });
        await expect(page.getByTestId('total')).toBeVisible();
      } finally {
        await test.info().attach('simulator log', { body: charger.log, contentType: 'text/plain' });
        await charger.stop();
      }
    },
  );

  test(
    'the Sessions tab lists charges with totals, a receipt and a CSV export',
    { tag: ['@module-32'] },
    async ({ page }) => {
      const app = new MobileApp(page);
      await app.signIn();
      await app.open('/tabs/sessions');
      await expect(page.getByTestId('totals')).toBeVisible();
      await expect(page.getByTestId('session').filter({ hasText: '£8.80' })).toBeVisible();
      const csv = page.waitForEvent('download');
      await page.getByTestId('csv').click();
      expect((await csv).suggestedFilename()).toMatch(/\.csv$/);
      await page.getByTestId('session').filter({ hasText: '£8.80' }).click();
      await expect(page.getByTestId('total')).toContainText('£8.80');
      await expect(page.getByTestId('receipt')).toBeVisible();
    },
  );
});

test.describe('Mobile app: nearby sites', () => {
  test(
    'with location allowed, home lists Riverside Car Park nearby',
    { tag: ['@module-35'] },
    async ({ page, context }) => {
      await context.setGeolocation({ latitude: 51.5055, longitude: -0.0754 });
      const app = new MobileApp(page);
      await app.signIn();
      const useLocation = page.getByTestId('use-location');
      if (await useLocation.isVisible()) {
        await useLocation.click();
      }
      await expect(page.getByTestId('nearby')).toContainText('Riverside Car Park', {
        timeout: 30_000,
      });
    },
  );

  test(
    'with location refused, home explains and still works',
    { tag: ['@module-35'] },
    async ({ page, context }) => {
      await context.clearPermissions();
      const app = new MobileApp(page);
      await app.signIn();
      const useLocation = page.getByTestId('use-location');
      if (await useLocation.isVisible()) {
        await useLocation.click();
      }
      await expect(
        page
          .getByTestId('nearby-denied')
          .or(page.getByTestId('nearby-unavailable'))
          .or(page.getByTestId('nearby-ask')),
      ).toBeVisible();
      await expect(page.getByTestId('scan')).toBeVisible();
    },
  );
});
