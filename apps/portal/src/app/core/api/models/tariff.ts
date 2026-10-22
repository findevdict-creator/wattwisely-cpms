import { Weekday } from './site';

/** One price band: on these days, between these local times, these prices ("0.3450"). */
export interface TariffBand {
  name: string;
  days: Weekday[];
  start: string;
  end: string;
  energy_price_per_kwh: string;
  time_price_per_hour: string;
  idle_fee_per_minute: string;
}

/** The prices of a tariff version. Amounts are minor units; the tax rate is a percentage. */
export interface TariffPrices {
  tax_rate: string;
  is_tax_included: boolean;
  start_fee: number;
  idle_grace_minutes: number;
  idle_fee_cap: number | null;
  minimum_price: number | null;
  maximum_price: number | null;
  is_free_without_energy: boolean;
  bands: TariffBand[];
  note?: string;
}

/** One saved version; the highest number is in force for new sessions. */
export interface TariffVersion extends TariffPrices {
  id: string;
  number: number;
  note: string;
  created_at: string;
}

/** GET /v1/tariffs: a tariff with the prices in force. */
export interface Tariff {
  id: string;
  name: string;
  currency: string;
  status: 'active' | 'archived';
  site_count: number;
  current_version: TariffVersion;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface TariffPage {
  items: Tariff[];
  next_cursor: string | null;
}

/** Body of POST /v1/tariffs/preview: prices and a made-up session. */
export interface TariffPreviewRequest {
  currency: string;
  time_zone: string;
  prices: TariffPrices;
  started_at: string;
  ended_at: string;
  energy_wh: number;
  idle_minutes: number;
}

/** One receipt line, of a session or a preview. */
export interface ReceiptLine {
  kind: 'start_fee' | 'energy' | 'time' | 'idle' | 'adjustment';
  band_name: string | null;
  from: string | null;
  to: string | null;
  quantity: number;
  unit: 'wh' | 'min' | 'session';
  unit_price: string | null;
  net: number;
  tax: number;
  gross: number;
}

export interface TariffPreview {
  currency: string;
  lines: ReceiptLine[];
  net_total: number;
  tax_total: number;
  gross_total: number;
  energy_wh: number;
  charging_minutes: number;
  idle_minutes: number;
  billable_idle_minutes: number;
  flags: string[];
}
