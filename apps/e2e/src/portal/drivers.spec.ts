import { expect, test } from '@playwright/test';
import { AuthStates } from '../support/auth-states';
import { DemoUsers } from '../support/demo-users';
import { Mailpit } from '../support/mailpit';
import { StackUrls } from '../support/stack-urls';

// Module 13 (drivers, RFID cards, access groups) and module 19 (driver accounts, invitations).
test.use({ storageState: AuthStates.of('portal', DemoUsers.OWNER) });

test.describe('Drivers, cards and access groups', () => {
  test(
    'the driver list shows active and blocked drivers with their groups',
    { tag: ['@module-13'] },
    async ({ page }) => {
      await page.goto(`${StackUrls.PORTAL}/drivers`);
      await expect(page.getByRole('row', { name: /Dana Driver/ })).toContainText('Depot staff');
      await expect(page.getByRole('row', { name: /Ben Blocked/ })).toContainText('Blocked');
      await page.getByRole('button', { name: 'Blocked', exact: true }).click();
      await expect(page.getByRole('row', { name: /Dana Driver/ })).toHaveCount(0);
      await expect(page.getByRole('row', { name: /Ben Blocked/ })).toBeVisible();
    },
  );

  test(
    'a driver page shows cards, charges and the linked login',
    { tag: ['@module-13', '@module-19'] },
    async ({ page }) => {
      await page.goto(`${StackUrls.PORTAL}/drivers/01900000-0000-7000-8000-000000007001`);
      await expect(page.getByRole('row', { name: /DEMO-CARD-1/ })).toContainText('Active');
      await expect(page.getByText("Linked to the driver's own login")).toBeVisible();
      // The newest five charges: the demo charge of 10 March, or the ones the OCPP tests made since.
      const recent = page.getByRole('region', { name: 'Recent charges' });
      await expect(recent.getByRole('row').nth(1)).toContainText(/£\d+\.\d\d/);
    },
  );

  test(
    'the access groups page shows Depot staff opening Depot North for free',
    { tag: ['@module-13', '@module-19'] },
    async ({ page }) => {
      await page.goto(`${StackUrls.PORTAL}/drivers/groups`);
      const row = page.getByRole('row', { name: /Depot staff/ });
      await expect(row).toContainText('Depot North');
      await expect(row).toContainText('Free, you pay');
    },
  );

  test(
    'an Owner adds a driver with an e-mail and invites them to the app',
    { tag: ['@module-13', '@module-19'] },
    async ({ page }) => {
      const stamp = Date.now();
      const email = `driver-${stamp}@e2e.test`;
      const name = `Erin E2E ${stamp}`;
      const since = new Date();
      await page.goto(`${StackUrls.PORTAL}/drivers`);
      await page.getByRole('button', { name: 'Add driver' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('textbox', { name: /Name/ }).first().fill(name);
      await dialog.getByRole('textbox', { name: /E-mail/ }).fill(email);
      await dialog
        .getByRole('button', { name: /Add driver|Save|Add/ })
        .last()
        .click();
      await expect(page.getByRole('link', { name })).toBeVisible();
      await page.getByRole('link', { name }).click();
      await page.getByRole('button', { name: 'Invite to the app' }).click();
      const confirm = page.getByRole('dialog').getByRole('button', { name: /Invite|Send/ });
      if (await confirm.isVisible().catch(() => false)) {
        await confirm.click();
      }
      const mail = await Mailpit.waitFor(email, 'Charge with', since);
      expect(await Mailpit.text(mail.ID)).toMatch(/invitations\//);
    },
  );
});
