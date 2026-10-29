import { expect, test } from '@playwright/test';
import { AuthStates } from '../support/auth-states';
import { DemoUsers } from '../support/demo-users';
import { StackUrls } from '../support/stack-urls';

// Module 15 (Wattwisely invoices its tenants): the worker drafted September's invoices; an Admin
// issues Acme's, and its Owner then sees it under Settings, Invoices.
test.describe('Tenant invoicing', () => {
  test(
    'the invoice list shows the drafts the worker made',
    { tag: ['@module-15'] },
    async ({ browser }) => {
      const context = await browser.newContext({
        storageState: AuthStates.of('admin', DemoUsers.ADMIN),
      });
      const page = await context.newPage();
      await page.goto(`${StackUrls.ADMIN}/invoices`);
      await expect(page.getByRole('row', { name: /Acme Charging/ }).first()).toContainText(
        /\$433\.20/,
      );
      await expect(page.getByRole('row', { name: /Volt Hotels/ }).first()).toContainText(
        /\$299\.00/,
      );
      await context.close();
    },
  );

  test(
    'an Admin issues Acme’s draft and the Owner sees it in the portal',
    { tag: ['@module-15'] },
    async ({ browser }) => {
      const adminContext = await browser.newContext({
        storageState: AuthStates.of('admin', DemoUsers.ADMIN),
      });
      const admin = await adminContext.newPage();
      await admin.goto(`${StackUrls.ADMIN}/invoices`);
      await expect(admin.getByRole('row', { name: /Acme Charging/ }).first()).toBeVisible();
      const draft = admin
        .getByRole('row', { name: /Acme Charging/ })
        .filter({ hasText: 'Draft' })
        .first();
      test.skip(
        !(await draft.isVisible()),
        'Acme’s draft was issued by an earlier run on this stack; run stack-up for a fresh one',
      );
      await draft.getByRole('link').first().click();
      await admin.getByTestId('invoice-actions').click();
      await admin.getByTestId('issue-invoice').click();
      await admin.getByRole('dialog').getByRole('button', { name: 'Issue' }).click();
      await expect(admin.getByText(/Issued|Open|Due/).first()).toBeVisible();

      await adminContext.close();
      const ownerContext = await browser.newContext({
        storageState: AuthStates.of('portal', DemoUsers.OWNER),
      });
      const owner = await ownerContext.newPage();
      await owner.goto(`${StackUrls.PORTAL}/settings/invoices`);
      await expect(owner.getByText('September 2026').first()).toBeVisible();
      await expect(owner.getByText(/433\.20/).first()).toBeVisible();
      await ownerContext.close();
    },
  );
});
