import { StoredTariffBand } from '@wattwisely/db';
import { CurrentBandFinder } from './current-band.finder';

describe('CurrentBandFinder', () => {
  const everyDay: StoredTariffBand['days'] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const band = (name: string, start: string, end: string): StoredTariffBand => ({
    name,
    days: everyDay,
    start,
    end,
    energyPricePerKwh: 3000,
    timePricePerHour: 0,
    idleFeePerMinute: 0,
  });
  const bands = [band('Off-peak', '00:00', '17:00'), band('Peak', '17:00', '24:00')];

  it('reads the clock in the site’s zone', () => {
    // 16:30 UTC on 10 June is 17:30 in London (BST) and 12:30 in New York.
    const at = new Date('2026-06-10T16:30:00Z');
    expect(CurrentBandFinder.nameAt(bands, 'Europe/London', at)).toBe('Peak');
    expect(CurrentBandFinder.nameAt(bands, 'America/New_York', at)).toBe('Off-peak');
  });

  it('answers null when no band covers the moment', () => {
    const weekdaysOnly = [{ ...band('Weekdays', '00:00', '24:00'), days: ['mon', 'tue'] }];
    expect(
      CurrentBandFinder.nameAt(
        weekdaysOnly as StoredTariffBand[],
        'Europe/London',
        new Date('2026-06-13T10:00:00Z'),
      ),
    ).toBeNull();
  });
});
