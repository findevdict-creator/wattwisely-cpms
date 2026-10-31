import { PublicTariff } from '@wattwisely/driver-core';
import { PriceRows } from './price-rows';

describe('PriceRows', () => {
  const band = (name: string, start: string, end: string, energy: string) => ({
    name,
    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    start,
    end,
    energy_price_per_kwh: energy,
    time_price_per_hour: '0.0000',
    idle_fee_per_minute: '0.1000',
  });
  const tariff: PublicTariff = {
    name: 'Standard',
    currency: 'EUR',
    tax_rate: '23.00',
    is_tax_included: true,
    start_fee: 0,
    idle_grace_minutes: 15,
    idle_fee_cap: 1000,
    minimum_price: null,
    maximum_price: null,
    is_free_without_energy: true,
    bands: [
      band('off-peak', '00:00', '07:00', '0.3000'),
      band('peak', '07:00', '21:00', '0.4500'),
      band('off-peak', '21:00', '24:00', '0.3000'),
    ],
    current_band: 'peak',
  };

  it('lists the price now, the other band and the idle fee, as the design does', () => {
    expect(PriceRows.of(tariff)).toEqual([
      { label: 'Energy now (peak until 21:00)', value: '€0.45 per kWh' },
      { label: 'Off-peak from 21:00', value: '€0.30 per kWh' },
      { label: 'Idle fee after 15 min', value: '€0.10 per min, cap €10.00' },
    ]);
  });

  it('estimates 30 kWh at the price in force now, with the start fee', () => {
    expect(PriceRows.estimate(tariff)).toBe('about €13.50');
    expect(PriceRows.estimate({ ...tariff, start_fee: 100 })).toBe('about €14.50');
  });

  it('says "Energy" for one price all day, and leaves out fees that are nothing', () => {
    const flat = {
      ...tariff,
      bands: [{ ...band('standard', '00:00', '24:00', '0.4000'), idle_fee_per_minute: '0' }],
      current_band: 'standard',
    };
    expect(PriceRows.of(flat)).toEqual([{ label: 'Energy', value: '€0.40 per kWh' }]);
  });
});
