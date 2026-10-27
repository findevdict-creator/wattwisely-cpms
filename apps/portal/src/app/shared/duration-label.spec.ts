import { DurationLabel } from './duration-label';

describe('DurationLabel', () => {
  const now = new Date('2026-10-27T12:00:00Z');

  it('writes seconds, minutes, then hours and minutes', () => {
    expect(DurationLabel.of(45_000)).toBe('45 s');
    expect(DurationLabel.of(18 * 60_000)).toBe('18 min');
    expect(DurationLabel.of(66 * 60_000)).toBe('1 h 06');
  });

  it('runs to now while something is still going', () => {
    expect(DurationLabel.between('2026-10-27T11:42:00Z', null, now)).toBe('18 min');
    expect(DurationLabel.between('2026-10-27T10:00:00Z', '2026-10-27T11:07:00Z', now)).toBe(
      '1 h 07',
    );
  });

  it('says how long ago a charger was heard from', () => {
    expect(DurationLabel.ago('2026-10-27T11:59:30Z', now)).toBe('now');
    expect(DurationLabel.ago('2026-10-27T11:26:00Z', now)).toBe('34 min ago');
    expect(DurationLabel.ago('2026-10-27T09:00:00Z', now)).toBe('3 h ago');
    expect(DurationLabel.ago('2026-10-26T09:00:00Z', now)).toBe('26 Oct');
    expect(DurationLabel.ago(null, now)).toBe('never');
  });
});
