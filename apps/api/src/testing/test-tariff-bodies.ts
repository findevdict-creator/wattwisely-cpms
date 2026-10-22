/**
 * Request bodies for the tariff endpoints in tests: the design's worked example (off-peak
 * 0.30 until 17:00, peak 0.40 after, idle 0.10 a minute after 15 minutes, capped at
 * 10.00, 20% tax included).
 */
export class TestTariffBodies {
  static readonly EVERY_DAY = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  static band(name: string, start: string, end: string, energyPrice: string) {
    return {
      name,
      days: TestTariffBodies.EVERY_DAY,
      start,
      end,
      energy_price_per_kwh: energyPrice,
      time_price_per_hour: '0',
      idle_fee_per_minute: '0.10',
    };
  }

  static prices(overrides: Record<string, unknown> = {}) {
    return {
      tax_rate: '20',
      is_tax_included: true,
      start_fee: 0,
      idle_grace_minutes: 15,
      idle_fee_cap: 1000,
      is_free_without_energy: true,
      bands: [
        TestTariffBodies.band('Off-peak', '00:00', '17:00', '0.30'),
        TestTariffBodies.band('Peak', '17:00', '24:00', '0.40'),
      ],
      ...overrides,
    };
  }

  static tariff(name: string, overrides: Record<string, unknown> = {}) {
    return { name, currency: 'GBP', prices: TestTariffBodies.prices(overrides) };
  }
}
