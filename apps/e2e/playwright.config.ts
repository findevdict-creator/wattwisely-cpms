import { defineConfig, devices } from '@playwright/test';

// End-to-end suite (apps/e2e/README.md). One project per surface; "setup" signs every demo user
// in once through Keycloak and saves the browser state the other projects start from.
const REPORT = '../../dist/e2e-report';
const PHONE = { ...devices['Pixel 7'] };

export default defineConfig({
  testDir: './src',
  outputDir: '../../dist/e2e-results/artifacts',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // The journeys share the seeded demo tenants, so they run one at a time, in file order.
  workers: Number(process.env['E2E_WORKERS'] ?? 1),
  fullyParallel: false,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: `${REPORT}/html`, open: 'never' }],
    ['junit', { outputFile: `${REPORT}/junit.xml` }],
    ['json', { outputFile: `${REPORT}/results.json` }],
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: 'setup', testMatch: /setup\/.*\.setup\.ts/ },
    { name: 'api', testMatch: /api\/.*\.spec\.ts/ },
    { name: 'ocpp', testMatch: /ocpp\/.*\.spec\.ts/ },
    { name: 'portal', testMatch: /portal\/.*\.spec\.ts/, dependencies: ['setup'] },
    { name: 'admin', testMatch: /admin\/.*\.spec\.ts/, dependencies: ['setup'] },
    { name: 'driver', testMatch: /driver\/.*\.spec\.ts/, dependencies: ['setup'], use: PHONE },
    {
      name: 'mobile',
      testMatch: /mobile\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...PHONE, permissions: ['geolocation'] },
    },
    { name: 'quality', testMatch: /quality\/.*\.spec\.ts/, dependencies: ['setup'] },
  ],
});
