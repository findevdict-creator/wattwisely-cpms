import { Money, NearbyPlace } from '@wattwisely/driver-core';

/** The Nearby list's words (Figma 9, Home): "Acme Charging · 0.4 km · from €0.30 per kWh". */
export class NearbyWords {
  static line(place: NearbyPlace): string {
    return [place.operator_name, NearbyWords.distance(place.distance_m), NearbyWords.terms(place)]
      .filter(Boolean)
      .join(' · ');
  }

  /** "0.4 km" near, "12 km" farther. */
  static distance(metres: number): string {
    const km = metres / 1000;
    return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
  }

  /** "2 of 4" plugs free. */
  static free(place: NearbyPlace): string {
    return `${place.available_count} of ${place.connector_count}`;
  }

  private static terms(place: NearbyPlace): string {
    if (place.is_private_site) {
      return 'members only';
    }
    if (place.from_energy_price_per_kwh && place.currency) {
      return `from ${Money.unitPrice(place.from_energy_price_per_kwh, place.currency)} per kWh`;
    }
    return '';
  }
}
