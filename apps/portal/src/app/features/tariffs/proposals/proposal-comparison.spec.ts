import { TariffBand, TariffPrices } from '../../../core/api/models/tariff';
import { ProposalComparison } from './proposal-comparison';

describe('ProposalComparison', () => {
  const band = (name: string, energy: string, extra: Partial<TariffBand> = {}): TariffBand => ({
    name,
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    start: '17:00',
    end: '21:00',
    energy_price_per_kwh: energy,
    time_price_per_hour: '0',
    idle_fee_per_minute: '0.10',
    ...extra,
  });
  const prices = (bands: TariffBand[], extra: Partial<TariffPrices> = {}): TariffPrices => ({
    tax_rate: '20',
    is_tax_included: true,
    start_fee: 100,
    idle_grace_minutes: 15,
    idle_fee_cap: null,
    minimum_price: null,
    maximum_price: null,
    is_free_without_energy: true,
    bands,
    ...extra,
  });

  it('says how far each price moves', () => {
    const now = prices([band('Peak', '0.40'), band('Off-peak', '0.30', { days: ['sat', 'sun'] })]);
    const proposed = prices([
      band('Peak', '0.45', { idle_fee_per_minute: '0.15' }),
      band('Off-peak', '0.30', { days: ['sat', 'sun'] }),
    ]);
    const rows = ProposalComparison.rows(now, proposed, 'EUR');
    expect(rows.map((row) => [row.label, row.now, row.proposed, row.change])).toEqual([
      ['Peak, Mon–Fri 17:00–21:00', '€0.40 per kWh', '€0.45 per kWh', '+12.5%'],
      ['Off-peak, Sat, Sun 17:00–21:00', '€0.30 per kWh', '€0.30 per kWh', 'Same'],
      ['Idle fee after 15 min', '€0.10 per min', '€0.15 per min', '+50%'],
      ['Start fee', '€1.00', '€1.00', 'Same'],
    ]);
    expect(rows[0].tone).toBe('warn');
  });

  it('marks bands that go and prices that fall', () => {
    const now = prices([band('Peak', '0.40'), band('Night', '0.20')], { start_fee: 0 });
    const proposed = prices([band('Peak', '0.36')], { start_fee: 50 });
    const rows = ProposalComparison.rows(now, proposed, 'GBP');
    expect(rows[0].change).toBe('−10%');
    expect(rows[0].tone).toBe('ok');
    expect(rows[1]).toMatchObject({ proposed: 'Removed', change: 'Removed' });
    expect(rows.find((row) => row.label === 'Start fee')).toMatchObject({
      now: 'None',
      proposed: '£0.50',
      change: 'Changed',
    });
  });

  it('has nothing to compare for a new tariff', () => {
    const rows = ProposalComparison.rows(null, prices([band('All day', '0.30')]), 'GBP');
    expect(rows.every((row) => row.now === '' && row.change === 'New')).toBe(true);
  });
});
