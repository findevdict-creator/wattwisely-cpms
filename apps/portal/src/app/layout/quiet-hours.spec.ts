import { QuietHours } from './quiet-hours';

describe('QuietHours', () => {
  it('accepts both times or neither', () => {
    expect(QuietHours.problem('', '')).toBe('');
    expect(QuietHours.problem('22:00', '07:00')).toBe('');
  });

  it('refuses one time on its own, bad times and equal times', () => {
    expect(QuietHours.problem('22:00', '')).toContain('both');
    expect(QuietHours.problem('25:00', '07:00')).toContain('22:00');
    expect(QuietHours.problem('07:00', '07:00')).toContain('differ');
  });

  it('sends empty times as null', () => {
    expect(QuietHours.toSettings('', '', 'Europe/London')).toEqual({
      quiet_hours_start: null,
      quiet_hours_end: null,
      time_zone: 'Europe/London',
    });
  });
});
