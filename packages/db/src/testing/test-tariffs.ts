import { UuidV7 } from '../client/uuid-v7';
import { StoredTariffBand } from '../schema/tariff-versions.table';
import { TestData } from './test-data';

/** The prices of a test tariff version; anything left out takes the default below. */
export interface TestTariffPrices {
  currency?: string;
  taxRate?: number;
  isTaxIncluded?: boolean;
  startFee?: number;
  idleGraceMinutes?: number;
  idleFeeCap?: number | null;
  isFreeWithoutEnergy?: boolean;
  bands?: StoredTariffBand[];
}

/**
 * Tariffs for tests: by default the design's worked example (off-peak 0.30 until 17:00,
 * peak 0.40 after, idle 0.10 a minute after 15 minutes, capped at 10.00, 20% tax included).
 */
export class TestTariffs {
  static readonly EVERY_DAY: StoredTariffBand['days'] = [
    'mon',
    'tue',
    'wed',
    'thu',
    'fri',
    'sat',
    'sun',
  ];
  static readonly WORKED_EXAMPLE_BANDS: StoredTariffBand[] = [
    TestTariffs.band('Off-peak', '00:00', '17:00', 3000),
    TestTariffs.band('Peak', '17:00', '24:00', 4000),
  ];

  constructor(private readonly data: TestData) {}

  static band(
    name: string,
    start: string,
    end: string,
    energyPricePerKwh: number,
  ): StoredTariffBand {
    return {
      name,
      days: TestTariffs.EVERY_DAY,
      start,
      end,
      energyPricePerKwh,
      timePricePerHour: 0,
      idleFeePerMinute: 1000,
    };
  }

  /** A tariff with one version; returns the tariff id and the version id. */
  async create(
    tenantId: string,
    name: string,
    prices: TestTariffPrices = {},
  ): Promise<{ tariffId: string; versionId: string }> {
    const tariffId = UuidV7.create();
    await this.data.sql(
      'insert into tariffs (id, tenant_id, name, currency) values ($1, $2, $3, $4)',
      [tariffId, tenantId, name, prices.currency ?? 'GBP'],
    );
    const versionId = await this.addVersion(tenantId, tariffId, 1, prices);
    return { tariffId, versionId };
  }

  async addVersion(
    tenantId: string,
    tariffId: string,
    number: number,
    prices: TestTariffPrices = {},
  ) {
    const versionId = UuidV7.create();
    await this.data.sql(
      `insert into tariff_versions (id, tenant_id, tariff_id, number, tax_rate, is_tax_included,
         start_fee, idle_grace_minutes, idle_fee_cap, is_free_without_energy, bands)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        versionId,
        tenantId,
        tariffId,
        number,
        prices.taxRate ?? 2000,
        prices.isTaxIncluded ?? true,
        prices.startFee ?? 0,
        prices.idleGraceMinutes ?? 15,
        prices.idleFeeCap === undefined ? 1000 : prices.idleFeeCap,
        prices.isFreeWithoutEnergy ?? true,
        JSON.stringify(prices.bands ?? TestTariffs.WORKED_EXAMPLE_BANDS),
      ],
    );
    return versionId;
  }

  /** New sessions on the site are priced with this tariff. */
  async assign(siteId: string, tariffId: string | null): Promise<void> {
    await this.data.sql('update sites set tariff_id = $2 where id = $1', [siteId, tariffId]);
  }
}
