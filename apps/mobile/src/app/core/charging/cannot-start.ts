import { ChipTone, DriverPlace, Money } from '@wattwisely/driver-core';

/** Why a charge cannot start, as the design's "Cannot start" card shows it. */
export interface CannotStart {
  chip: string;
  tone: ChipTone;
  title: string;
  text: string;
  /** The way forward, when there is one: ask the operator, or pick another card. */
  action: 'ask_operator' | 'add_card' | null;
}

/**
 * The words for each reason the API gives for refusing a plug (Figma 10, "Cannot start"):
 * members only, the plug offline or in use, no card for a hold, and the rest.
 */
export class CannotStarts {
  static of(place: DriverPlace): CannotStart | null {
    const access = place.access;
    if (access.can_charge || !access.reason) {
      return null;
    }
    const operator = place.branding.name || place.operator_name;
    switch (access.reason) {
      case 'private_site':
        return {
          chip: 'Members only',
          tone: 'danger',
          title: 'Private charger',
          text: `Only members of ${operator} can charge here. Ask ${operator} for an invitation.`,
          action: place.branding.support_email ? 'ask_operator' : null,
        };
      case 'plug_unavailable':
        return CannotStarts.unavailable(place);
      case 'no_payment_method':
        return CannotStarts.noCard(place, operator);
      default:
        return CannotStarts.other(access.reason_words, operator);
    }
  }

  private static unavailable(place: DriverPlace): CannotStart {
    if (place.availability === 'busy') {
      const text = 'Someone is charging here. Pull down to check again, or try another plug.';
      return { chip: 'In use', tone: 'warn', title: 'Connector in use', text, action: null };
    }
    const isOffline = place.availability === 'offline' || !place.is_charger_online;
    return {
      chip: isOffline ? 'Offline' : 'Out of service',
      tone: isOffline ? 'neutral' : 'danger',
      title: isOffline ? 'Charger offline' : 'Out of service',
      text: 'Try another plug at this site, or another site nearby.',
      action: null,
    };
  }

  private static noCard(place: DriverPlace, operator: string): CannotStart {
    const hold = place.access.payment.hold_amount ?? place.hold_amount;
    const amount = hold && place.tariff ? ` of ${Money.format(hold, place.tariff.currency)}` : '';
    return {
      chip: 'No card',
      tone: 'warn',
      title: 'Add a card first',
      text: `${operator} asks for a card hold${amount} before a charge.`,
      action: 'add_card',
    };
  }

  private static other(words: string | null, operator: string): CannotStart {
    return {
      chip: 'Cannot start',
      tone: 'danger',
      title: 'This plug cannot start for you',
      text: words ?? `Ask ${operator} why.`,
      action: null,
    };
  }
}
