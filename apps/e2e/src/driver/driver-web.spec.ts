import { expect, Page, test } from '@playwright/test';
import { AuthStates } from '../support/auth-states';
import { ChargerProcess } from '../support/charger-process';
import { DemoUsers } from '../support/demo-users';
import { StackUrls } from '../support/stack-urls';

// Module 7 (the QR plug page), module 8 (branding), module 19 (driver accounts) and module 26
// (the driver web app), on a phone-sized screen.
/** The plug page keeps its tokens per tab, so a new tab starts logged out; Keycloak's own session lets the driver back in without a password. */
class DriverPlugPage {
  static async openSignedIn(page: Page, identity: string): Promise<void> {
    await page.goto(`${StackUrls.DRIVER}/c/${identity}/1`);
    await page
      .getByRole('link', { name: /Log in to use your saved card/ })
      .or(page.getByRole('button', { name: /Log in to use your saved card/ }))
      .click();
    await expect(page.getByTestId('account-start')).toBeVisible({ timeout: 30_000 });
  }
}

test.describe('Driver web app, without signing in', () => {
  test(
    'the QR plug page shows the site, the operator’s brand and its prices',
    { tag: ['@module-7', '@module-8', '@module-26'] },
    async ({ page }) => {
      await page.goto(`${StackUrls.DRIVER}/c/${DemoUsers.RIVERSIDE_CHARGER}/1`);
      await expect(page.getByRole('heading', { name: 'Riverside Car Park' })).toBeVisible();
      await expect(page.getByText('Acme Charging · 12 Thames Path, London')).toBeVisible();
      await expect(page.getByText('Type 2 · AC · up to 22 kW')).toBeVisible();
      await expect(page.getByText('£0.30 per kWh')).toBeVisible();
      await expect(page.getByText('£0.40 per kWh')).toBeVisible();
      await expect(page.getByText('Prices include 20% tax.')).toBeVisible();
      await expect(page.getByRole('link', { name: 'help@acme.test' })).toHaveAttribute(
        'href',
        'mailto:help@acme.test',
      );
    },
  );

  test('an unknown charger says it cannot be found', { tag: ['@module-7'] }, async ({ page }) => {
    await page.goto(`${StackUrls.DRIVER}/c/NO-SUCH-CHARGER/1`);
    await expect(page.locator('body')).toContainText(
      /not found|can't find|cannot find|doesn't exist|no charger/i,
    );
  });
});

test.describe('Driver web app, signed in as Dana', () => {
  test.use({ storageState: AuthStates.of('driver', DemoUsers.DANA) });

  test(
    'the account page shows Dana, her cards and her operators',
    { tag: ['@module-19', '@module-26'] },
    async ({ page }) => {
      await page.goto(`${StackUrls.DRIVER}/account`);
      await expect(page.getByText('dana@acme.test').first()).toBeVisible();
      await expect(page.getByText('Card payments are not switched on here.')).toBeVisible();
      await expect(page.getByRole('link', { name: /Acme Charging/ })).toContainText(
        'Knows you as Dana Driver · EMP-0042',
      );
    },
  );

  test(
    'an operator page shows what the operator holds about Dana',
    { tag: ['@module-19'] },
    async ({ page }) => {
      await page.goto(`${StackUrls.DRIVER}/account/operators/${DemoUsers.ACME_ID}`);
      await expect(page.getByText('+44 7700 900123')).toBeVisible();
      await expect(page.getByText('DEMO-CARD-1')).toBeVisible();
      await expect(page.getByText('Depot staff')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Leave this operator' })).toBeVisible();
    },
  );

  test(
    'Dana’s charges list the demo charge with its receipt, and export to CSV',
    { tag: ['@module-19', '@module-26'] },
    async ({ page }) => {
      await page.goto(`${StackUrls.DRIVER}/account/charges`);
      const charge = page.getByRole('link', { name: /Riverside Car Park · A.*Mar 10, 2026/ });
      await expect(charge).toContainText('£8.80');
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: 'CSV' }).click();
      expect((await download).suggestedFilename()).toMatch(/\.csv$/);
      await charge.click();
      await expect(
        page.getByRole('heading', { name: 'Riverside Car Park · Plug A' }),
      ).toBeVisible();
      await expect(page.locator('body')).toContainText('£8.80');
      await expect(page.locator('body')).toContainText('22.00 kWh');
    },
  );

  test(
    'signed in, the plug page says how Dana pays here: free through her access group',
    { tag: ['@module-13', '@module-19'] },
    async ({ page }) => {
      const charger = new ChargerProcess(DemoUsers.RIVERSIDE_CHARGER);
      await charger.start();
      try {
        await DriverPlugPage.openSignedIn(page, DemoUsers.RIVERSIDE_CHARGER);
        await expect(page.getByTestId('free')).toContainText('Free: group Depot staff');
        await expect(page.getByTestId('account-charge')).toBeEnabled();
      } finally {
        await charger.stop();
      }
    },
  );

  test(
    'Dana charges for free at Depot North, then stops from her phone',
    { tag: ['@module-13', '@module-19', '@module-26'] },
    async ({ page }) => {
      test.setTimeout(180_000);
      const charger = new ChargerProcess(DemoUsers.DEPOT_CHARGER);
      await charger.start();
      try {
        await DriverPlugPage.openSignedIn(page, DemoUsers.DEPOT_CHARGER);
        await expect(page.getByTestId('free')).toBeVisible();
        await page.getByTestId('account-charge').click();
        // An account charge opens its own page under Your charges, live while it runs.
        await expect(page.getByRole('heading', { name: 'Depot North · Plug A' })).toBeVisible({
          timeout: 45_000,
        });
        await expect(page.getByText('Charging', { exact: true })).toBeVisible({ timeout: 45_000 });
        await expect(page.getByText('Free', { exact: true })).toBeVisible();
        await charger.waitForLog(/connector 1: \d+ Wh/, 30_000);
        await page.getByRole('button', { name: 'Stop charging' }).click();
        await charger.waitForLog(/transaction \d+ stopped[\s\S]*connector 1: Available/, 45_000);
        await expect(page.getByText('Done', { exact: true })).toBeVisible({ timeout: 60_000 });
      } finally {
        await test.info().attach('simulator log', { body: charger.log, contentType: 'text/plain' });
        await charger.stop();
      }
    },
  );
});
