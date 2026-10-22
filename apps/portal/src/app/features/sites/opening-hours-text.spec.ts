import { OpeningHoursText } from './opening-hours-text';

describe('OpeningHoursText', () => {
  const weekday = [{ opens: '08:00', closes: '18:00' }];

  it('joins days with the same hours', () => {
    expect(
      OpeningHoursText.describe({
        mon: weekday,
        tue: weekday,
        wed: weekday,
        thu: weekday,
        fri: weekday,
        sat: [{ opens: '10:00', closes: '14:00' }],
      }),
    ).toBe('Mon–Fri 08:00–18:00, Sat 10:00–14:00');
  });

  it('keeps days apart across a closed day', () => {
    expect(OpeningHoursText.describe({ mon: weekday, wed: weekday })).toBe(
      'Mon 08:00–18:00, Wed 08:00–18:00',
    );
  });

  it('has words for always open and never open', () => {
    expect(OpeningHoursText.describe(null)).toBe('Open 24 hours a day');
    expect(OpeningHoursText.describe({})).toBe('Closed');
  });
});
