import {
  DriverChargeDetail,
  DriverPlace,
  DriverPlaceAccess,
  PublicBranding,
  PublicTariff,
} from '@wattwisely/driver-core';

/** A plug and a charge as the API answers for Dana at Acme's Riverside site, for the specs. */
export class ChargingFixtures {
  static readonly TARIFF: PublicTariff = {
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
      {
        name: 'standard',
        days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        start: '00:00',
        end: '24:00',
        energy_price_per_kwh: '0.4500',
        time_price_per_hour: '0.0000',
        idle_fee_per_minute: '0.1000',
      },
    ],
    current_band: 'standard',
  };

  static readonly BRANDING: PublicBranding = {
    name: 'Acme Charging',
    logo_url: null,
    primary_color: '#0e7490',
    on_primary_color: '#ffffff',
    accent_color: '#0e7490',
    support_email: 'help@acme.test',
    support_phone: null,
    support_url: null,
    platform_name: 'Wattwisely',
  };

  static readonly ACCESS: DriverPlaceAccess = {
    tenant_id: 'acme',
    is_linked: true,
    is_guest_record: false,
    is_blocked: false,
    is_private_site: false,
    is_member: true,
    needs_consent: false,
    payment: {
      outcome: 'pay',
      decided_by: 'operator',
      label: null,
      words: "Paid: the operator's standard",
      hold_amount: 2000,
    },
    card: { brand: 'visa', last4: '4242' },
    can_charge: true,
    reason: null,
    reason_words: null,
  };

  static readonly PAYMENT: DriverChargeDetail['payment'] = {
    status: 'authorised',
    hold_amount: 2000,
    card_brand: 'visa',
    card_last4: '4242',
    failure_message: null,
  };

  static place(changes: Partial<DriverPlace['access']> = {}): DriverPlace {
    return {
      operator_name: 'Acme Charging',
      site_name: 'Riverside Car Park',
      address: { line1: '12 Riverside Road', city: 'Dublin', postal_code: 'D01', country: 'IE' },
      time_zone: 'Europe/Dublin',
      charger_identity: 'SIM-001',
      ocpp_connector_id: 1,
      connector_label: 'B',
      connector_type: 'ccs2',
      current_type: 'dc',
      max_power_kw: 150,
      connector_status: 'available',
      is_charger_online: true,
      availability: 'available',
      is_card_payment_accepted: true,
      hold_amount: 5000,
      tariff: ChargingFixtures.TARIFF,
      branding: ChargingFixtures.BRANDING,
      access: { ...ChargingFixtures.ACCESS, ...changes },
    };
  }

  static charge(changes: Partial<DriverChargeDetail> = {}): DriverChargeDetail {
    return {
      id: 'session-1',
      tenant_id: 'acme',
      operator_name: 'Acme Charging',
      site_name: 'Riverside Car Park',
      charger_identity: 'SIM-001',
      connector_label: 'B',
      ocpp_connector_id: 1,
      status: 'starting',
      time_zone: 'Europe/Dublin',
      started_at: '2026-10-29T18:00:00Z',
      ended_at: null,
      energy_wh: 0,
      currency: 'EUR',
      amount: null,
      is_paid: true,
      start_source: 'account',
      payment_rule: null,
      payment: ChargingFixtures.PAYMENT,
      failure_reason: null,
      receipt: null,
      can_stop: false,
      is_stop_requested: false,
      charge_key: null,
      ...changes,
    };
  }
}
