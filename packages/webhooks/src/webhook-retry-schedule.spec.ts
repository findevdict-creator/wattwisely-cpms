import { WebhookRetrySchedule } from './webhook-retry-schedule';

describe('WebhookRetrySchedule', () => {
  const now = new Date('2026-10-24T12:00:00Z');

  it('waits a minute, then longer and longer, and gives up after the sixth attempt', () => {
    expect(WebhookRetrySchedule.nextAttemptAt(1, now)).toEqual(new Date('2026-10-24T12:01:00Z'));
    expect(WebhookRetrySchedule.nextAttemptAt(2, now)).toEqual(new Date('2026-10-24T12:05:00Z'));
    expect(WebhookRetrySchedule.nextAttemptAt(5, now)).toEqual(new Date('2026-10-25T00:00:00Z'));
    expect(WebhookRetrySchedule.nextAttemptAt(6, now)).toBeNull();
    expect(WebhookRetrySchedule.MAX_ATTEMPTS).toBe(6);
  });
});
