import { DayLabel } from './day-label';

describe('DayLabel', () => {
  const now = new Date(2026, 9, 27, 10, 30);

  it('says today and yesterday by the calendar, not by 24 hours', () => {
    expect(DayLabel.day(new Date(2026, 9, 27, 0, 5).toISOString(), now)).toBe('Today');
    expect(DayLabel.day(new Date(2026, 9, 26, 23, 50).toISOString(), now)).toBe('Yesterday');
  });

  it('gives the date for older days, with the year only when it is not this one', () => {
    expect(DayLabel.day(new Date(2026, 9, 20, 12).toISOString(), now)).not.toMatch(/2026/);
    expect(DayLabel.day(new Date(2025, 11, 31, 12).toISOString(), now)).toMatch(/2025/);
  });

  it('puts the day before the time', () => {
    expect(DayLabel.dayAndTime(new Date(2026, 9, 27, 9, 6).toISOString(), now)).toMatch(
      /^Today, .*\d\d.\d\d/,
    );
  });

  it('writes today and yesterday in lower case inside a sentence', () => {
    expect(DayLabel.inSentence(new Date(2026, 9, 27, 8).toISOString(), now)).toBe('today');
    expect(DayLabel.inSentence(new Date(2026, 9, 26, 8).toISOString(), now)).toBe('yesterday');
    expect(DayLabel.inSentence(new Date(2026, 9, 20, 8).toISOString(), now)).toMatch(/20/);
  });
});
