import { ManagedNoticePolicy } from './managed-notice.policy';

describe('ManagedNoticePolicy', () => {
  const now = new Date('2026-05-01T10:00:00Z');

  it('ends exactly 30 days from now when no date is given', () => {
    expect(ManagedNoticePolicy.endsAtFor(null, now).toISOString()).toBe('2026-05-31T10:00:00.000Z');
  });

  it('keeps a later date and refuses an earlier one', () => {
    const later = new Date('2026-07-01T00:00:00Z');
    expect(ManagedNoticePolicy.endsAtFor(later, now)).toBe(later);
    expect(() => ManagedNoticePolicy.endsAtFor(new Date('2026-05-20T00:00:00Z'), now)).toThrow(
      /30 days from now, on 2026-05-31/,
    );
  });
});
