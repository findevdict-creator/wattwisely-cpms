import { expect, test } from '@playwright/test';
import { DemoUsers } from '../support/demo-users';
import { StackUrls } from '../support/stack-urls';

// Module 12: public endpoints are limited per address (RATE_LIMIT_PUBLIC_PER_MINUTE, 300 in the
// example settings). The test waits for the window to pass so later projects are not throttled.
test(
  'a burst on a public endpoint is answered 429 with Retry-After, then served again',
  { tag: ['@module-12'] },
  async () => {
    test.setTimeout(150_000);
    const url = `${StackUrls.API}/v1/public/places/${DemoUsers.RIVERSIDE_CHARGER}/1`;
    let throttled: Response | undefined;
    // Twice the budget, so a burst that straddles the minute boundary still runs out.
    for (let attempt = 0; attempt < 700 && !throttled; attempt += 1) {
      const response = await fetch(url);
      await response.arrayBuffer();
      if (response.status === 429) {
        throttled = response;
      }
    }
    expect(throttled, 'a 429 within 700 requests').toBeDefined();
    expect(Number((throttled as Response).headers.get('retry-after'))).toBeGreaterThan(0);
    await expect
      .poll(async () => (await fetch(url)).status, { timeout: 90_000, intervals: [5_000] })
      .toBe(200);
  },
);
