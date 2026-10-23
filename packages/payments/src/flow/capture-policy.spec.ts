import { CapturePolicy } from './capture-policy';

describe('CapturePolicy', () => {
  it('captures the price, never more than the hold, and flags a price above it', () => {
    expect(CapturePolicy.amountToCapture(880, 5000)).toEqual({ amount: 880, isAboveHold: false });
    expect(CapturePolicy.amountToCapture(5000, 5000)).toEqual({ amount: 5000, isAboveHold: false });
    expect(CapturePolicy.amountToCapture(6200, 5000)).toEqual({ amount: 5000, isAboveHold: true });
    expect(CapturePolicy.amountToCapture(null, 5000)).toEqual({ amount: 0, isAboveHold: false });
    expect(CapturePolicy.amountToCapture(-5, 5000)).toEqual({ amount: 0, isAboveHold: false });
  });

  it('stops the charger at 90% of the hold', () => {
    expect(CapturePolicy.isAutoStopDue(4499, 5000)).toBe(false);
    expect(CapturePolicy.isAutoStopDue(4500, 5000)).toBe(true);
    expect(CapturePolicy.isAutoStopDue(450, 500)).toBe(true);
  });

  it('waits 1, 2, 4… minutes between tries, at most 4 hours, for 72 hours in all', () => {
    const now = new Date('2026-03-10T17:00:00Z');
    const minutes = (attempts: number) =>
      (CapturePolicy.nextAttemptAt(attempts, now).getTime() - now.getTime()) / 60_000;

    expect([0, 1, 2, 3].map(minutes)).toEqual([1, 2, 4, 8]);
    expect(minutes(20)).toBe(240);
    expect(CapturePolicy.isGivenUp(new Date('2026-03-08T17:00:00Z'), now)).toBe(false);
    expect(CapturePolicy.isGivenUp(new Date('2026-03-07T16:59:00Z'), now)).toBe(true);
    expect(CapturePolicy.isGivenUp(null, now)).toBe(false);
  });
});
