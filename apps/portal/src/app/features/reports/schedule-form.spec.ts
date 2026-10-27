import { ScheduleForm } from './schedule-form';

describe('ScheduleForm', () => {
  it('splits recipients on commas, spaces and new lines, once each', () => {
    expect(ScheduleForm.recipients('a@x.com, b@x.com\nc@x.com a@x.com')).toEqual([
      'a@x.com',
      'b@x.com',
      'c@x.com',
    ]);
  });

  it('needs a name and good addresses', () => {
    expect(ScheduleForm.problem(' ', ['a@x.com'])).toContain('name');
    expect(ScheduleForm.problem('Weekly', [])).toContain('at least one');
    expect(ScheduleForm.problem('Weekly', ['nope'])).toContain('nope');
    expect(ScheduleForm.problem('Weekly', ['a@x.com'])).toBe('');
  });

  it('starts a new schedule weekly, per site, active', () => {
    expect(ScheduleForm.initial(null, 'Europe/London')).toMatchObject({
      frequency: 'weekly',
      group_by: 'site',
      time_zone: 'Europe/London',
      is_active: true,
    });
  });
});
