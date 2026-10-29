import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { AuthStates } from '../support/auth-states';
import { DemoUsers } from '../support/demo-users';
import { StackUrls } from '../support/stack-urls';

// Module 20 (the design system) and module 29 (the interface): an automated WCAG 2.1 AA scan of
// the main screens of each app, with a full-page screenshot of each. Critical violations fail
// the test; the rest are attached to the report to read.
interface Screen {
  name: string;
  url: string;
  state?: string;
  isPhone?: boolean;
}

const SCREENS: Screen[] = [
  {
    name: 'portal home',
    url: `${StackUrls.PORTAL}/`,
    state: AuthStates.of('portal', DemoUsers.OWNER),
  },
  {
    name: 'portal sites',
    url: `${StackUrls.PORTAL}/sites`,
    state: AuthStates.of('portal', DemoUsers.OWNER),
  },
  {
    name: 'portal charger',
    url: `${StackUrls.PORTAL}/chargers/01900000-0000-7000-8000-00000000d001`,
    state: AuthStates.of('portal', DemoUsers.OWNER),
  },
  {
    name: 'portal sessions',
    url: `${StackUrls.PORTAL}/sessions`,
    state: AuthStates.of('portal', DemoUsers.OWNER),
  },
  {
    name: 'portal drivers',
    url: `${StackUrls.PORTAL}/drivers`,
    state: AuthStates.of('portal', DemoUsers.OWNER),
  },
  {
    name: 'portal tariffs',
    url: `${StackUrls.PORTAL}/tariffs`,
    state: AuthStates.of('portal', DemoUsers.OWNER),
  },
  {
    name: 'portal team',
    url: `${StackUrls.PORTAL}/team`,
    state: AuthStates.of('portal', DemoUsers.OWNER),
  },
  {
    name: 'admin overview',
    url: `${StackUrls.ADMIN}/`,
    state: AuthStates.of('admin', DemoUsers.ADMIN),
  },
  {
    name: 'admin tenants',
    url: `${StackUrls.ADMIN}/tenants`,
    state: AuthStates.of('admin', DemoUsers.ADMIN),
  },
  {
    name: 'admin invoices',
    url: `${StackUrls.ADMIN}/invoices`,
    state: AuthStates.of('admin', DemoUsers.ADMIN),
  },
  {
    name: 'driver plug page',
    url: `${StackUrls.DRIVER}/c/${DemoUsers.RIVERSIDE_CHARGER}/1`,
    isPhone: true,
  },
  {
    name: 'driver account',
    url: `${StackUrls.DRIVER}/account`,
    state: AuthStates.of('driver', DemoUsers.DANA),
    isPhone: true,
  },
  { name: 'mobile welcome', url: `${StackUrls.MOBILE}/welcome`, isPhone: true },
  { name: 'sign-in page', url: `${StackUrls.PORTAL}/`, isPhone: false },
];

for (const screen of SCREENS) {
  test(
    `${screen.name} has no critical accessibility violations`,
    { tag: ['@module-20', '@module-29'] },
    async ({ browser }) => {
      const context = await browser.newContext({
        storageState: screen.state,
        viewport: screen.isPhone ? { width: 412, height: 915 } : { width: 1440, height: 900 },
      });
      const page = await context.newPage();
      await page.goto(screen.url);
      // Live pages keep a connection open, so wait for the first heading rather than an idle network.
      await page.getByRole('heading').first().waitFor({ timeout: 30_000 });
      await page.waitForTimeout(1_000);
      await page.screenshot({
        path: test.info().outputPath(`${screen.name.replace(/\W+/g, '-')}.png`),
        fullPage: true,
      });
      await test.info().attach(`${screen.name} screenshot`, {
        path: test.info().outputPath(`${screen.name.replace(/\W+/g, '-')}.png`),
        contentType: 'image/png',
      });
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const summary = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.length,
      }));
      await test.info().attach('axe violations', {
        body: JSON.stringify(summary, null, 2),
        contentType: 'application/json',
      });
      for (const violation of summary) {
        test.info().annotations.push({
          type: `axe ${violation.impact}`,
          description: `${violation.id}: ${violation.help} (${violation.nodes})`,
        });
      }
      expect(
        summary.filter((v) => v.impact === 'critical'),
        'critical violations',
      ).toEqual([]);
      await context.close();
    },
  );
}
