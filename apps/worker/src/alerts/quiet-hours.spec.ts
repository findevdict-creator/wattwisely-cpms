import { QuietHours } from './quiet-hours';

describe('QuietHours', () => {
  const night = { start: '22:00', end: '07:00', timeZone: 'Europe/London' };

  it('sends at once outside the quiet hours or without any', () => {
    const noon = new Date('2026-03-10T12:00:00Z');
    expect(QuietHours.sendAt(night, noon)).toEqual(noon);
    expect(QuietHours.sendAt(null, noon)).toEqual(noon);
  });

  it('holds an e-mail until the quiet hours end, past midnight and in the local zone', () => {
    expect(QuietHours.sendAt(night, new Date('2026-03-10T23:30:00Z'))).toEqual(
      new Date('2026-03-11T07:00:00Z'),
    );
    // 10 July: London is on summer time, so 07:00 there is 06:00 UTC.
    expect(QuietHours.sendAt(night, new Date('2026-07-10T02:15:00Z'))).toEqual(
      new Date('2026-07-10T06:00:00Z'),
    );
  });

  it('handles quiet hours within one day', () => {
    const lunch = { start: '12:00', end: '13:00', timeZone: 'UTC' };
    expect(QuietHours.sendAt(lunch, new Date('2026-03-10T12:20:00Z'))).toEqual(
      new Date('2026-03-10T13:00:00Z'),
    );
  });
});
