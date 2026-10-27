import { Tariff, TariffBand, TariffPrices } from '../../core/api/models/tariff';
import { TariffSummary } from './tariff-summary';

describe('TariffSummary', () => {
  const band = (name: string, energy: string, extra: Partial<TariffBand> = {}): TariffBand => ({
    name,
    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    start: '00:00',
    end: '24:00',
    energy_price_per_kwh: energy,
    time_price_per_hour: '0.00',
    idle_fee_per_minute: '0.00',
    ...extra,
  });
  const prices = (bands: TariffBand[], extra: Partial<TariffPrices> = {}): TariffPrices =>
    ({
      tax_rate: '20.00',
      is_tax_included: true,
      start_fee: 0,
      idle_grace_minutes: 15,
      idle_fee_cap: null,
      bands,
      ...extra,
    }) as TariffPrices;

  it('gives the dearest energy price over the others', () => {
    const summary = TariffSummary.energy(
      prices([band('Off-peak', '0.30'), band('Peak', '0.40')]),
      'GBP',
    );
    expect(summary).toEqual({ main: '£0.40 per kWh Peak', foot: '£0.30 Off-peak' });
    expect(TariffSummary.energy(prices([band('All day', '0.32')]), 'GBP')).toEqual({
      main: '£0.32 per kWh',
      foot: 'All day',
    });
    expect(TariffSummary.energy(prices([band('All day', '0')]), 'GBP').main).toBe('Free');
  });

  it('describes time and idle fees with the grace and the cap', () => {
    const idle = prices([band('All day', '0.30', { idle_fee_per_minute: '0.10' })], {
      idle_fee_cap: 1500,
    });
    expect(TariffSummary.timeAndIdle(idle, 'GBP')).toBe(
      'Idle £0.10 per min after 15 min, max £15.00',
    );
    const hourly = prices([band('All day', '0.30', { time_price_per_hour: '0.6' })]);
    expect(TariffSummary.timeAndIdle(hourly, 'GBP')).toBe('£0.60 per hour');
    expect(TariffSummary.timeAndIdle(prices([band('All day', '0.30')]), 'GBP')).toBe('');
  });

  it('says how tax is counted and keeps a third decimal', () => {
    const tariff = { currency: 'EUR', current_version: prices([]) } as unknown as Tariff;
    expect(TariffSummary.taxLine(tariff)).toBe('EUR · VAT 20% included');
    expect(TariffSummary.price('0.385', 'GBP')).toBe('£0.385');
  });
});
