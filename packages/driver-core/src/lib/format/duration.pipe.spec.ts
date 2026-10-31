import { DurationPipe } from './duration.pipe';

describe('DurationPipe', () => {
  const pipe = new DurationPipe();

  it('counts whole minutes between two times, and up to now when the charge still runs', () => {
    expect(pipe.transform('2026-03-10T16:30:00Z', '2026-03-10T17:35:30Z')).toBe('1 h 05 min');
    expect(pipe.transform('2026-03-10T16:30:00Z', '2026-03-10T16:42:00Z')).toBe('12 min');
    const now = new Date('2026-03-10T18:31:00Z').getTime();
    expect(pipe.transform('2026-03-10T16:30:00Z', null, now)).toBe('2 h 01 min');
  });

  it('never goes negative when clocks disagree', () => {
    expect(pipe.transform('2026-03-10T16:30:00Z', '2026-03-10T16:29:00Z')).toBe('0 min');
  });
});
