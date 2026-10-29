import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { AuthStates } from '../support/auth-states';
import { Database } from '../support/database';
import { DemoUsers } from '../support/demo-users';
import { StackUrls } from '../support/stack-urls';

// Module 5 (sessions, tariffs, pricing engine) and module 23/24 (the redesigned pages).
test.use({ storageState: AuthStates.of('portal', DemoUsers.OWNER) });

test.describe('Tariffs and sessions', () => {
  test(
    'the tariff list shows the Standard tariff with peak, off-peak and idle prices',
    { tag: ['@module-5'] },
    async ({ page }) => {
      await page.goto(`${StackUrls.PORTAL}/tariffs`);
      const row = page.getByRole('row', { name: /Standard/ });
      await expect(row).toContainText('£0.40 per kWh');
      await expect(row).toContainText('£0.30');
      await expect(row).toContainText('Idle £0.10 per min after 15 min, max £10.00');
    },
  );

  test(
    'a new tariff prices a trial session with the real engine, then is saved',
    { tag: ['@module-5'] },
    async ({ page }) => {
      const name = `E2E tariff ${Date.now()}`;
      await page.goto(`${StackUrls.PORTAL}/tariffs/new`);
      await page.locator('input[formcontrolname=name]').first().fill(name);
      await page.locator('input[formcontrolname=energyPrice]').first().fill('0.50');
      await page.locator('input[formcontrolname=startFee]').fill('1.00');
      await page.locator('input[formcontrolname=energyKwh]').fill('10');
      await page.getByRole('button', { name: 'What would this cost?' }).click();
      await expect(page.getByText(/£6\.00/).first()).toBeVisible();
      await page.getByRole('button', { name: 'Create tariff' }).click();
      await expect(page).toHaveURL(/\/tariffs\/[0-9a-f-]{36}/);
      expect(await Database.one('select id from tariffs where name = $1', [name])).toBeTruthy();
    },
  );

  test(
    'the sessions list shows the demo session, priced at £8.80',
    { tag: ['@module-5', '@module-23'] },
    async ({ page }) => {
      await page.goto(`${StackUrls.PORTAL}/sessions`);
      const row = page.getByRole('row', { name: /10 Mar, 16:30/ });
      await expect(row).toContainText('Dana Driver');
      await expect(row).toContainText('22.0 kWh');
      await expect(row).toContainText('£8.80');
    },
  );

  test(
    'a session receipt splits off-peak, peak and idle time as the tariff says',
    { tag: ['@module-5'] },
    async ({ page }) => {
      await page.goto(`${StackUrls.PORTAL}/sessions/01900000-0000-7000-8000-000000005001`);
      await expect(page.getByRole('row', { name: /Energy, Off-peak/ })).toContainText('£3.00');
      await expect(page.getByRole('row', { name: /Energy, Peak/ })).toContainText('£4.80');
      await expect(page.getByRole('row', { name: /Idle fee, Peak/ })).toContainText('£1.00');
      await expect(page.getByText('Tariff Standard, version 1')).toBeVisible();
    },
  );

  test('sessions export to CSV', { tag: ['@module-5', '@module-11'] }, async ({ page }) => {
    await page.goto(`${StackUrls.PORTAL}/sessions`);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    const file = await (await download).path();
    const text = readFileSync(file, 'utf8');
    expect(text.split('\n')[0]).toMatch(/,/);
    expect(text).toContain('Riverside Car Park');
  });

  test(
    'Payments says card payments are off when the installation has no Stripe keys',
    { tag: ['@module-6'] },
    async ({ page }) => {
      await page.goto(`${StackUrls.PORTAL}/payments`);
      await expect(
        page.getByText(
          'Card payments are switched off on this installation: no Stripe keys are set.',
        ),
      ).toBeVisible();
      await expect(page.getByText('No card payments yet')).toBeVisible();
    },
  );
});
