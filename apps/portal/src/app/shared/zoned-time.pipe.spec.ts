import { ZonedTimePipe } from './zoned-time.pipe';

describe('ZonedTimePipe', () => {
  const pipe = new ZonedTimePipe();

  it('shows the time on the site clock', () => {
    expect(pipe.transform('2026-07-10T16:00:00Z', 'Europe/London')).toBe('17:00');
    expect(pipe.transform('2026-01-10T16:00:00Z', 'Europe/London')).toBe('16:00');
    expect(pipe.transform(null, 'Europe/London')).toBe('');
  });
});
