import { expect, test } from '@playwright/test';
import { AuthStates } from '../support/auth-states';
import { DemoUsers } from '../support/demo-users';
import { Mailpit } from '../support/mailpit';
import { StackUrls } from '../support/stack-urls';

// Module 9 (the admin console, plans and modules), module 10 (managed tenants) and module 25 (the console's screens).
test.describe('Admin console as an Admin', () => {
  test.use({ storageState: AuthStates.of('admin', DemoUsers.ADMIN) });

  test(
    'the overview counts tenants, connectors, chargers and staff',
    { tag: ['@module-9', '@module-25'] },
    async ({ page }) => {
      await page.goto(StackUrls.ADMIN);
      await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
      await expect(page.getByRole('link', { name: /Tenants\s*\d+/ })).toContainText(/\d+ active/);
      await expect(page.getByText('3 AC · 2 DC')).toBeVisible();
      await expect(page.getByRole('link', { name: /Wattwisely staff/ })).toContainText('2');
    },
  );

  test(
    'the tenant list filters by plan and opens a tenant with its plan and modules',
    { tag: ['@module-9', '@module-25'] },
    async ({ page }) => {
      await page.goto(`${StackUrls.ADMIN}/tenants?plan=starter`);
      await expect(page.getByRole('link', { name: 'Volt Hotels' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Acme Charging' })).toHaveCount(0);
      await page.goto(`${StackUrls.ADMIN}/tenants`);
      await page.getByRole('link', { name: 'Acme Charging' }).click();
      await expect(page.getByRole('heading', { name: 'Acme Charging' })).toBeVisible();
      await expect(page.getByText('5 / 500 (3 AC, 2 DC)')).toBeVisible();
      await expect(page.getByRole('row', { name: /Full reports/ })).toContainText('In the plan');
      await expect(page.getByRole('row', { name: /^Sites/ })).toContainText('Core, always on');
    },
  );

  test('an Admin creates a tenant with a first Owner', { tag: ['@module-9'] }, async ({ page }) => {
    const name = `E2E Tenant ${Date.now()}`;
    const ownerEmail = `owner-${Date.now()}@e2e.test`;
    const since = new Date();
    await page.goto(`${StackUrls.ADMIN}/tenants?new=1`);
    const dialog = page.getByRole('dialog');
    await dialog.getByTestId('tenant-name').fill(name);
    await dialog.getByTestId('tenant-plan').click();
    await page.getByRole('option', { name: /Starter/ }).click();
    await dialog.getByTestId('owner-email').fill(ownerEmail);
    await dialog.getByTestId('create-tenant').click();
    await expect(dialog).toBeHidden();
    await page.goto(`${StackUrls.ADMIN}/tenants`);
    await expect(page.getByRole('link', { name })).toBeVisible();
    const mail = await Mailpit.waitFor(ownerEmail, name, since);
    expect(await Mailpit.text(mail.ID)).toMatch(/invitations\//);
  });

  test(
    'the plans page lists every plan with its prices and the add-ons',
    { tag: ['@module-9'] },
    async ({ page }) => {
      await page.goto(`${StackUrls.ADMIN}/plans`);
      await expect(page.getByRole('row', { name: /Starter/ })).toContainText('$49.00');
      await expect(page.getByRole('row', { name: /Growth/ })).toContainText('$299.00');
      await expect(page.getByRole('row', { name: /Load management/ })).toContainText(
        '$3.00 per connector',
      );
      await expect(page.getByRole('button', { name: 'Edit Growth' })).toBeVisible();
    },
  );

  test(
    'the staff page lists staff and what each role may do',
    { tag: ['@module-9', '@module-25'] },
    async ({ page }) => {
      await page.goto(`${StackUrls.ADMIN}/staff`);
      await expect(page.getByRole('row', { name: /Ada Admin/ })).toContainText('Admin');
      await expect(page.getByRole('row', { name: /Sam Support/ })).toContainText('Support');
      await expect(
        page.getByText('Sees everything in the console and changes nothing.'),
      ).toBeVisible();
    },
  );

  test('the platform audit log shows what staff did', { tag: ['@module-9'] }, async ({ page }) => {
    await page.goto(`${StackUrls.ADMIN}/audit-log`);
    await expect(page.getByRole('heading', { name: 'Audit log' })).toBeVisible();
    await expect(page.getByText("Entries can't be edited or deleted.")).toBeVisible();
    await expect(page.getByRole('row').nth(1)).toBeVisible();
  });

  test(
    'the service report for a managed tenant sums the month',
    { tag: ['@module-10'] },
    async ({ page }) => {
      await page.goto(
        `${StackUrls.ADMIN}/tenants/01900000-0000-7000-8000-00000000a002/service-report`,
      );
      await expect(page.getByRole('heading', { name: 'Service report' })).toBeVisible();
      await expect(page.getByText(/Generated .* actions by Managed operators/)).toBeVisible();
    },
  );
});

test.describe('Admin console as Support', () => {
  test.use({ storageState: AuthStates.of('admin', DemoUsers.SUPPORT) });

  test('Support sees plans but cannot change them', { tag: ['@module-9'] }, async ({ page }) => {
    await page.goto(`${StackUrls.ADMIN}/plans`);
    await expect(page.getByRole('row', { name: /Growth/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New plan' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit Growth' })).toHaveCount(0);
  });
});

test.describe('Admin console as a tenant Owner', () => {
  test.use({ storageState: AuthStates.of('portal', DemoUsers.OWNER) });

  test(
    'a tenant Owner who signs in to the console is told it is for staff only',
    { tag: ['@module-9'] },
    async ({ page }) => {
      await page.goto(StackUrls.ADMIN);
      await expect(page).toHaveURL(/not-staff|auth\.localhost/);
    },
  );
});
