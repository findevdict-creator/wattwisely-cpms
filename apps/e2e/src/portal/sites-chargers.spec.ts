import { expect, test } from '@playwright/test';
import { AuthStates } from '../support/auth-states';
import { ChargerProcess } from '../support/charger-process';
import { Database } from '../support/database';
import { DemoUsers } from '../support/demo-users';
import { StackUrls } from '../support/stack-urls';

// Module 3 (sites, chargers, connectors) and module 4 (live status and commands), with the
// charger simulator standing in for the hardware.
test.use({ storageState: AuthStates.of('portal', DemoUsers.OWNER) });

test.describe('Sites and chargers', () => {
  test(
    'the sites page lists both demo sites with their visibility',
    { tag: ['@module-3', '@module-23'] },
    async ({ page }) => {
      await page.goto(`${StackUrls.PORTAL}/sites`);
      await expect(page.getByText(/\d+ sites · \d+ chargers/)).toBeVisible();
      await expect(page.getByText('12 Thames Path · public')).toBeVisible();
      await expect(page.getByText('3 Industrial Way · private')).toBeVisible();
    },
  );

  test(
    'a site page shows its connectors, opening hours and tariff',
    { tag: ['@module-3'] },
    async ({ page }) => {
      await page.goto(`${StackUrls.PORTAL}/sites/${DemoUsers.RIVERSIDE_ID}`);
      await expect(page.getByText(/\d+ connectors on \d+ chargers/)).toBeVisible();
      await expect(page.getByText('Mon–Fri 07:00–22:00, Sat 09:00–18:00').first()).toBeVisible();
      await expect(page.getByRole('link', { name: 'Standard' })).toBeVisible();
    },
  );

  test('an Owner adds a new site', { tag: ['@module-3'] }, async ({ page }) => {
    const name = `E2E Site ${Date.now()}`;
    await page.goto(`${StackUrls.PORTAL}/sites`);
    await page.getByRole('button', { name: 'Add site' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Name').fill(name);
    await dialog.getByRole('textbox', { name: 'Street', exact: true }).fill('1 Test Street');
    await dialog.getByRole('textbox', { name: 'City' }).fill('Bristol');
    await dialog.getByRole('textbox', { name: 'Postal code' }).fill('BS1 1AA');
    await dialog.getByRole('spinbutton', { name: 'Latitude' }).fill('51.4545');
    await dialog.getByRole('spinbutton', { name: 'Longitude' }).fill('-2.5879');
    await dialog.getByRole('button', { name: 'Add site' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(name).first()).toBeVisible();
    expect(await Database.one('select id from sites where name = $1', [name])).toBeTruthy();
  });

  test(
    'an Owner registers a charger, which waits for its first connection',
    { tag: ['@module-3'] },
    async ({ page }) => {
      const identity = `E2E-${Date.now().toString(36).toUpperCase()}`;
      await page.goto(`${StackUrls.PORTAL}/sites/${DemoUsers.RIVERSIDE_ID}`);
      await page.getByRole('button', { name: 'Register charger' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('radio', { name: /Use the charger's own ID/ }).check();
      await dialog.getByRole('textbox').first().fill(identity);
      await dialog.getByRole('button', { name: 'Register', exact: true }).click();
      await expect(page.getByText(identity).first()).toBeVisible();
      await page.goto(`${StackUrls.PORTAL}/chargers`);
      await expect(page.getByRole('link', { name: identity })).toBeVisible();
      await expect(page.getByRole('row', { name: new RegExp(identity) })).toContainText(
        'Waiting for first connection',
      );
    },
  );

  test(
    'a charger turns online and logs its messages when the simulator connects',
    { tag: ['@module-4'] },
    async ({ page }) => {
      const charger = new ChargerProcess(DemoUsers.RIVERSIDE_CHARGER);
      await charger.start();
      try {
        await page.goto(`${StackUrls.PORTAL}/chargers/01900000-0000-7000-8000-00000000d001`);
        await expect(page.getByRole('heading', { level: 1 })).toContainText('Available', {
          timeout: 30_000,
        });
        await expect(page.getByText('BootNotification').first()).toBeVisible({ timeout: 30_000 });
      } finally {
        await charger.stop();
      }
    },
  );

  test(
    'a charge started and stopped from the portal becomes a priced session',
    { tag: ['@module-4', '@module-5'] },
    async ({ page }) => {
      test.setTimeout(180_000);
      const charger = new ChargerProcess(DemoUsers.RIVERSIDE_CHARGER);
      await charger.start();
      try {
        await page.goto(`${StackUrls.PORTAL}/chargers/01900000-0000-7000-8000-00000000d001`);
        await expect(page.getByRole('heading', { level: 1 })).toContainText('Available', {
          timeout: 30_000,
        });
        const connectorA = page.getByRole('region', { name: 'Connector A' });
        await connectorA.getByRole('button', { name: 'Start charging' }).click();
        await expect(page.getByText('Start charging: accepted')).toBeVisible();
        await expect(connectorA).toContainText('Charging', { timeout: 45_000 });
        await charger.waitForLog(/connector 1: \d+ Wh/, 30_000);
        await connectorA.getByRole('button', { name: 'Stop charging' }).click();
        // After the stop the simulated car leaves: Finishing, then Available.
        await charger.waitForLog(/transaction \d+ stopped[\s\S]*connector 1: Available/, 45_000);
      } finally {
        await test.info().attach('simulator log', { body: charger.log, contentType: 'text/plain' });
        await charger.stop();
      }
      // The worker prices the session once the car has left, and completes it.
      await expect
        .poll(
          async () =>
            Database.one<{ status: string; energy_wh: string; is_priced: boolean }>(
              `select s.status, s.energy_wh::text as energy_wh, s.priced_at is not null as is_priced
         from charging_sessions s join chargers c on c.id = s.charger_id
         where c.ocpp_identity = $1 order by s.started_at desc limit 1`,
              [DemoUsers.RIVERSIDE_CHARGER],
            ),
          { timeout: 60_000 },
        )
        .toMatchObject({
          status: 'completed',
          energy_wh: expect.stringMatching(/^[1-9]/),
          is_priced: true,
        });
      await page.goto(`${StackUrls.PORTAL}/sessions`);
      await expect(page.getByRole('row').nth(1)).toContainText(/Completed|Done|£/);
    },
  );
});
