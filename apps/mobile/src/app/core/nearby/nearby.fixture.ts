import { NearbyPlace } from '@wattwisely/driver-core';

/** Two sites as GET /v1/driver/places/nearby answers for Dana in Dublin, for the specs. */
export class NearbyFixtures {
  static readonly RIVERSIDE: NearbyPlace = {
    tenant_id: 'acme',
    operator_name: 'Acme Charging',
    site_id: 'site-riverside',
    site_name: 'Riverside Car Park',
    address: '12 Riverside Road, Dublin',
    latitude: 53.3478,
    longitude: -6.2597,
    distance_m: 420,
    connector_count: 4,
    available_count: 2,
    is_private_site: false,
    is_member: true,
    currency: 'EUR',
    from_energy_price_per_kwh: '0.3000',
    plug: { charger_identity: 'WW-7KQ4M2XR9T', ocpp_connector_id: 2 },
  };

  static readonly DEPOT: NearbyPlace = {
    ...NearbyFixtures.RIVERSIDE,
    site_id: 'site-depot',
    site_name: 'Depot North',
    distance_m: 12_400,
    available_count: 0,
    is_private_site: true,
    plug: null,
  };
}
