import { test as setup } from '@playwright/test';
import { AuthStates } from '../support/auth-states';
import { DemoUsers } from '../support/demo-users';
import { KeycloakLogin } from '../support/keycloak-login';
import { StackUrls } from '../support/stack-urls';

// Signs each demo user in once (module 1): staff set up their authenticator app here, as a
// person does at first login, and every later test starts from the saved Keycloak session.
const SIGN_INS: { app: 'portal' | 'admin' | 'driver' | 'mobile'; url: string; email: string }[] = [
  { app: 'portal', url: StackUrls.PORTAL, email: DemoUsers.OWNER },
  { app: 'portal', url: StackUrls.PORTAL, email: DemoUsers.TECH },
  { app: 'portal', url: StackUrls.PORTAL, email: DemoUsers.MULTI },
  { app: 'portal', url: StackUrls.PORTAL, email: DemoUsers.NOBODY },
  { app: 'admin', url: StackUrls.ADMIN, email: DemoUsers.ADMIN },
  { app: 'admin', url: StackUrls.ADMIN, email: DemoUsers.SUPPORT },
  { app: 'driver', url: `${StackUrls.DRIVER}/account`, email: DemoUsers.DANA },
  { app: 'mobile', url: `${StackUrls.MOBILE}/welcome`, email: DemoUsers.DANA },
];

for (const signIn of SIGN_INS) {
  setup(`sign in ${signIn.email} to the ${signIn.app}`, async ({ page }) => {
    if (signIn.app === 'mobile') {
      await page.goto(signIn.url);
      await page.getByRole('button', { name: /sign in/i }).click();
      await new KeycloakLogin(page).submitPassword(signIn.email, DemoUsers.PASSWORD);
    } else {
      await new KeycloakLogin(page).signIn(signIn.url, signIn.email);
    }
    await page.waitForURL((url) => !url.href.startsWith(StackUrls.KEYCLOAK), { timeout: 30_000 });
    await page.waitForLoadState('networkidle');
    await page.context().storageState({ path: AuthStates.of(signIn.app, signIn.email) });
  });
}
