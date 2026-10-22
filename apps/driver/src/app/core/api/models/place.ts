/** One price band of the tariff at the plug. Unit prices are decimal strings, e.g. "0.4000" per kWh. */
export interface TariffBand {
  name: string;
  days: string[];
  start: string;
  end: string;
  energy_price_per_kwh: string;
  time_price_per_hour: string;
  idle_fee_per_minute: string;
}

/** The prices at a plug, as GET /v1/public/places answers. Amounts are minor units of `currency`. */
export interface PublicTariff {
  name: string;
  currency: string;
  tax_rate: string;
  is_tax_included: boolean;
  start_fee: number;
  idle_grace_minutes: number;
  idle_fee_cap: number | null;
  minimum_price: number | null;
  maximum_price: number | null;
  is_free_without_energy: boolean;
  bands: TariffBand[];
  /** The band in force at the site right now. */
  current_band: string | null;
}

import { PublicBranding } from './branding';

export type PlaceAvailability = 'available' | 'busy' | 'offline' | 'out_of_service' | 'faulted';

/** The plug a QR code names: who runs it, where it is, whether it is free, what it costs. */
export interface Place {
  operator_name: string;
  site_name: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    postal_code: string;
    region?: string;
    country: string;
  };
  time_zone: string;
  charger_identity: string;
  ocpp_connector_id: number;
  connector_label: string;
  connector_type: string;
  current_type: 'ac' | 'dc' | null;
  max_power_kw: number | null;
  connector_status: string;
  is_charger_online: boolean;
  availability: PlaceAvailability;
  is_card_payment_accepted: boolean;
  hold_amount: number | null;
  tariff: PublicTariff | null;
  branding: PublicBranding;
}
