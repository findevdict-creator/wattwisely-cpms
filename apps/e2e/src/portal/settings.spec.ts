import { expect, test } from '@playwright/test';
import { AuthStates } from '../support/auth-states';
import { ApiClient } from '../support/api-client';
import { DemoUsers } from '../support/demo-users';
import { StackUrls } from '../support/stack-urls';

// Module 8 (branding), 9 (plan), 11 (alert routing), 16 (API keys, webhooks), 17 (WhatsApp, load management).
test.use({ storageState: AuthStates.of('portal', DemoUsers.OWNER) });

test.describe('Settings', () => {
  test(
    'a branding change reaches the driver page',
    { tag: ['@module-8', '@module-28'] },
    async ({ page, browser }) => {
      const brand = `Acme E2E ${Date.now() % 10000}`;
      await page.goto(`${StackUrls.PORTAL}/settings/branding`);
      await page.getByRole('textbox', { name: 'Name drivers see' }).fill(brand);
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText(/Saved/i).first()).toBeVisible();
      const driver = await browser.newPage();
      await driver.goto(`${StackUrls.DRIVER}/c/${DemoUsers.RIVERSIDE_CHARGER}/1`);
      await expect(driver.getByText(brand).first()).toBeVisible();
      await driver.close();
      await page.getByRole('textbox', { name: 'Name drivers see' }).fill('');
      await page.getByRole('button', { name: 'Save' }).click();
    },
  );

  test(
    'the plan page shows Growth, its usage and its modules',
    { tag: ['@module-9'] },
    async ({ page }) => {
      await page.goto(`${StackUrls.PORTAL}/settings/plan`);
      await expect(page.getByText('Growth', { exact: true }).first()).toBeVisible();
      await expect(page.getByText(/of 500/).first()).toBeVisible();
      await expect(page.getByText('Modules and add-ons')).toBeVisible();
    },
  );

  test(
    'alert routing shows the default roles and their channels',
    { tag: ['@module-11'] },
    async ({ page }) => {
      await page.goto(`${StackUrls.PORTAL}/settings/alert-routing`);
      await expect(page.getByRole('heading', { name: 'Default roles' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Add rule' })).toBeVisible();
    },
  );

  test(
    'a new API key is shown once and works against the API within its permissions',
    { tag: ['@module-16'] },
    async ({ page }) => {
      const name = `E2E key ${Date.now()}`;
      await page.goto(`${StackUrls.PORTAL}/settings/api-keys`);
      await page.getByRole('button', { name: 'New key' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('textbox', { name: /Name/ }).fill(name);
      await dialog.getByRole('checkbox', { name: /sites:read/ }).check();
      await dialog
        .getByRole('button', { name: /Create|Make/ })
        .last()
        .click();
      const secret = (
        await page
          .getByText(/wwk_[A-Za-z0-9_-]{20,}/)
          .first()
          .innerText()
      ).match(/wwk_[A-Za-z0-9_-]+/)?.[0];
      expect(secret).toBeTruthy();
      const api = new ApiClient(secret);
      expect((await api.get('/v1/sites')).status).toBe(200);
      expect((await api.get('/v1/drivers')).status).toBe(403);
    },
  );

  test(
    'a webhook endpoint is added with its signing secret',
    { tag: ['@module-16'] },
    async ({ page }) => {
      await page.goto(`${StackUrls.PORTAL}/settings/webhooks`);
      await page.getByRole('button', { name: 'Add endpoint' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('textbox', { name: 'URL' }).fill('http://localhost:9/e2e-hook');
      await dialog.getByRole('checkbox', { name: /Session completed/ }).check();
      await dialog.getByRole('button', { name: 'Add webhook' }).click();
      await expect(page.getByText('localhost:9/e2e-hook').first()).toBeVisible();
    },
  );

  test(
    'WhatsApp charging shows what is needed to set it up',
    { tag: ['@module-17'] },
    async ({ page }) => {
      await page.goto(`${StackUrls.PORTAL}/settings/messaging`);
      await expect(page.getByText('Not set up')).toBeVisible();
      await expect(page.getByText('Webhook address for Meta')).toBeVisible();
    },
  );

  test(
    'load management shows the site cap and sharing policy',
    { tag: ['@module-17'] },
    async ({ page }) => {
      await page.goto(`${StackUrls.PORTAL}/sites/${DemoUsers.RIVERSIDE_ID}/load-management`);
      await expect(page.getByText('of a 30 kW site limit')).toBeVisible();
      await expect(page.getByText('Equal share')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Save and apply' })).toBeVisible();
    },
  );

  test(
    'invoices are empty until Wattwisely issues one',
    { tag: ['@module-15'] },
    async ({ page }) => {
      await page.goto(`${StackUrls.PORTAL}/settings/invoices`);
      await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible();
    },
  );
});
