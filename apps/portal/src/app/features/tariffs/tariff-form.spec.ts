import { Tariff } from '../../core/api/models/tariff';
import { TariffBandForm } from './tariff-band-form';
import { TariffForm } from './tariff-form';

describe('TariffForm', () => {
  const tariff = {
    id: 't1',
    name: 'Standard',
    currency: 'GBP',
    current_version: {
      tax_rate: '20.00',
      is_tax_included: true,
      start_fee: 50,
      idle_grace_minutes: 15,
      idle_fee_cap: 1000,
      minimum_price: null,
      maximum_price: null,
      is_free_without_energy: true,
      bands: [
        {
          name: 'Peak',
          days: ['sat', 'mon'],
          start: '17:00',
          end: '24:00',
          energy_price_per_kwh: '0.4000',
          time_price_per_hour: '0.0000',
          idle_fee_per_minute: '0.1000',
        },
      ],
    },
  } as unknown as Tariff;

  it('shows saved prices the way people type them', () => {
    const form = TariffForm.from(tariff);
    expect(form.fields.getRawValue()).toMatchObject({
      taxRate: '20',
      startFee: '0.50',
      idleFeeCap: '10.00',
      minimumPrice: '',
    });
    expect(form.bands.at(0).getRawValue()).toMatchObject({ energyPrice: '0.40', idleFee: '0.10' });
  });

  it('turns the fields back into the API prices, amounts in minor units', () => {
    const form = TariffForm.from(tariff);
    form.fields.patchValue({ maximumPrice: '25', note: ' Peak up ' });
    expect(form.toPrices()).toEqual({
      tax_rate: '20',
      is_tax_included: true,
      start_fee: 50,
      idle_grace_minutes: 15,
      idle_fee_cap: 1000,
      minimum_price: null,
      maximum_price: 2500,
      is_free_without_energy: true,
      bands: [
        {
          name: 'Peak',
          days: ['mon', 'sat'],
          start: '17:00',
          end: '24:00',
          energy_price_per_kwh: '0.40',
          time_price_per_hour: '0.00',
          idle_fee_per_minute: '0.10',
        },
      ],
      note: 'Peak up',
    });
  });

  it('starts a new tariff with one all-day band and refuses bad prices', () => {
    const form = new TariffForm();
    form.fields.patchValue({ name: 'Fleet' });
    expect(form.isValid()).toBe(true);
    form.bands.at(0).patchValue({ energyPrice: '0.12345' });
    expect(form.isValid()).toBe(false);
    expect(TariffBandForm.trim('0.3450')).toBe('0.345');
    expect(TariffBandForm.trim('1.0000')).toBe('1.00');
  });
});
