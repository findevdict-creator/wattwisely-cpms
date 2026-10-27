import { TariffBandForm } from './tariff-band-form';

describe('TariffBandForm', () => {
  it('writes the days of a band the short way', () => {
    expect(TariffBandForm.daysText(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])).toBe(
      'every day',
    );
    expect(TariffBandForm.daysText(['mon', 'tue', 'wed', 'thu', 'fri'])).toBe('Mon–Fri');
    expect(TariffBandForm.daysText(['sat', 'sun'])).toBe('Sat, Sun');
    expect(TariffBandForm.daysText(['mon', 'wed', 'fri'])).toBe('Mon, Wed, Fri');
  });
});
