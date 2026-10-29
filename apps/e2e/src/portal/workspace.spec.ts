import { expect, test } from '@playwright/test';
import { AuthStates } from '../support/auth-states';
import { Database } from '../support/database';
import { DemoUsers } from '../support/demo-users';
import { Mailpit } from '../support/mailpit';
import { StackUrls } from '../support/stack-urls';

// Module 2 (team, invitations, audit log), module 14 (custom roles) and module 11 (alerts).
test.use({ storageState: AuthStates.of('portal', DemoUsers.OWNER) });

test.describe('Team, roles, alerts and audit log', () => {
  test(
    'the team lists each member with their role and where it applies',
    { tag: ['@module-2'] },
    async ({ page }) => {
      await page.goto(`${StackUrls.PORTAL}/team`);
      await expect(page.getByRole('row', { name: /Olivia Owner/ })).toContainText('Owner');
      await expect(page.getByRole('row', { name: /Theo Tech/ })).toContainText(
        'Riverside Car Park',
      );
      await expect(page.getByRole('row', { name: /Mia Multi/ })).toContainText('Operations');
    },
  );

  test(
    'an Owner invites a new member, who gets the invitation by e-mail',
    { tag: ['@module-2'] },
    async ({ page }) => {
      const email = `member-${Date.now()}@e2e.test`;
      const since = new Date();
      await page.goto(`${StackUrls.PORTAL}/team`);
      await page.getByRole('button', { name: 'Invite member' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('textbox', { name: /E-mail/ }).fill(email);
      await dialog.getByRole('checkbox', { name: /^Read-only/ }).check();
      await dialog.getByRole('button', { name: 'Send invitation' }).click();
      await expect(page.getByText(email).first()).toBeVisible();
      const mail = await Mailpit.waitFor(email, '', since);
      expect(await Mailpit.text(mail.ID)).toMatch(/invitations\//);
    },
  );

  test(
    'the permission matrix shows built-in roles and the custom Depot supervisor',
    { tag: ['@module-14'] },
    async ({ page }) => {
      await page.goto(`${StackUrls.PORTAL}/team/roles`);
      for (const role of [
        'Owner',
        'Operations',
        'Finance',
        'Technician',
        'Read-only',
        'Managed operator',
        'Depot supervisor',
      ]) {
        await expect(page.getByRole('button', { name: new RegExp(`^${role}`) })).toBeVisible();
      }
      await expect(page.getByText('All 45')).toBeVisible();
    },
  );

  test(
    'an Owner creates a custom role from a built-in one',
    { tag: ['@module-14'] },
    async ({ page }) => {
      const name = `E2E role ${Date.now()}`;
      await page.goto(`${StackUrls.PORTAL}/team/roles`);
      await page.getByRole('button', { name: 'New role' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('textbox', { name: 'Name' }).fill(name);
      await dialog.getByRole('checkbox', { name: /See sites sites:read/ }).check();
      await dialog.getByRole('checkbox', { name: /See chargers and their messages/ }).check();
      await dialog.getByRole('button', { name: 'Create role' }).click();
      await expect(page.getByRole('button', { name: new RegExp(name) })).toBeVisible();
      expect(await Database.one('select id from roles where name = $1', [name])).toBeTruthy();
    },
  );

  test(
    'open alerts list the offline chargers, and acknowledging moves one on',
    { tag: ['@module-11'] },
    async ({ page }) => {
      // The seed opens alerts for a faulted plug and two chargers no longer connected; the OCPP
      // tests may have closed some by connecting those chargers, so take the first one open.
      await page.goto(`${StackUrls.PORTAL}/alerts`);
      const row = page
        .getByRole('row')
        .filter({ has: page.getByRole('button', { name: 'Acknowledge' }) })
        .first();
      await expect(row).toContainText(/WW-|SN-/);
      const charger = ((await row.innerText()).match(/(WW|SN)-[A-Z0-9]+/) ?? [''])[0];
      await row.getByRole('button', { name: 'Acknowledge' }).click();
      await page.getByRole('dialog').getByRole('textbox', { name: /Note/ }).fill('On it (E2E)');
      await page.getByRole('dialog').getByRole('button', { name: 'Acknowledge' }).click();
      await expect(page.getByRole('dialog')).toBeHidden();
      await page.getByRole('button', { name: /^Acknowledged/ }).click();
      await expect(page.getByRole('row', { name: new RegExp(charger) }).first()).toBeVisible();
    },
  );

  test('an alert e-mail reached the Owner', { tag: ['@module-11'] }, async () => {
    const mail = await Mailpit.waitFor(DemoUsers.OWNER, 'Alert:');
    expect(mail.Subject).toMatch(/offline|faulted/);
  });

  test(
    'the audit log records changes and exports to CSV',
    { tag: ['@module-2'] },
    async ({ page }) => {
      await page.goto(`${StackUrls.PORTAL}/audit-log`);
      await expect(page.getByRole('button', { name: 'sites.created' }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'tariffs.created' }).first()).toBeVisible();
      const download = page
        .waitForEvent('download', { timeout: 30_000 })
        .then((file) => file.suggestedFilename());
      await page.getByRole('button', { name: 'Export CSV' }).click();
      const outcome = await Promise.race([
        download,
        page
          .getByText(/Reports|export/i)
          .last()
          .waitFor({ timeout: 30_000 })
          .then(() => 'background export'),
      ]);
      expect(outcome).toMatch(/\.csv$|background export/);
    },
  );
});
