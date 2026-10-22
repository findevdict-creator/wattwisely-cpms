import { TariffVersionRow } from './tariff-prices';

/** One tariffs row as the repository returns it. */
export interface TariffRecord {
  id: string;
  name: string;
  currency: string;
  status: 'active' | 'archived';
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/** A tariff with its prices in force and how many sites use it, as the API shows it. */
export interface TariffSummary extends TariffRecord {
  currentVersion: TariffVersionRow;
  siteCount: number;
}
