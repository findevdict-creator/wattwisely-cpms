import { ChargeWords, DriverPlace, Money } from '@wattwisely/driver-core';

/**
 * The plug page's sentences (Figma 9, "Plug details"): the plug in one line, who the driver is
 * to the operator and how they pay, and the start button's words.
 */
export class PlugWords {
  /** "Connector B · CCS · DC 150 kW · 12 Riverside Road". */
  static line(place: DriverPlace): string {
    const power = [
      place.current_type?.toUpperCase(),
      place.max_power_kw && `${place.max_power_kw} kW`,
    ];
    return [
      `Connector ${place.connector_label}`,
      ChargeWords.connectorType(place.connector_type),
      power.filter(Boolean).join(' '),
      place.address.line1,
    ]
      .filter(Boolean)
      .join(' · ');
  }

  /** The operator holds this much on the card before a paid charge; null when nothing. */
  static hold(place: DriverPlace): string | null {
    const access = place.access;
    const amount = access.payment.hold_amount ?? place.hold_amount;
    if (access.payment.outcome !== 'pay' || !amount || !place.tariff) {
      return null;
    }
    return Money.format(amount, place.tariff.currency);
  }

  /** "You are a member of Acme Charging", or a guest's or a first charge's title. */
  static accessTitle(place: DriverPlace, operator: string): string {
    if (place.access.is_member) {
      return `You are a member of ${operator}`;
    }
    return place.access.needs_consent
      ? `Your first charge with ${operator}`
      : `You charge with ${operator} as a guest`;
  }

  /** "Hold of €20.00 on Visa •••• 4242, charged only what you use.", or the free rule's words. */
  static accessText(place: DriverPlace): string {
    const access = place.access;
    const hold = PlugWords.hold(place);
    if (access.payment.outcome === 'free') {
      return access.payment.words;
    }
    const card = access.card ? ` on ${PlugWords.card(access.card.brand, access.card.last4)}` : '';
    return hold
      ? `Hold of ${hold}${card}, charged only what you use.`
      : `Paid with your card${card}.`;
  }

  /** "Visa •••• 4242". */
  static card(brand: string, last4: string): string {
    return `${brand.charAt(0).toUpperCase()}${brand.slice(1)} •••• ${last4}`;
  }

  /** "Hold €20.00 and start" on a paid charge; "Start charging" otherwise. */
  static startLabel(place: DriverPlace): string {
    const hold = PlugWords.hold(place);
    return hold ? `Hold ${hold} and start` : 'Start charging';
  }
}
