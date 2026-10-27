import { PaymentAccountRow, ResolvedPaymentRule, UsableSavedCard } from '@wattwisely/payments';
import { PlaceAvailability } from '../../drivers/places/place-availability';

/** The operator's record of the logged-in driver, when it has one. */
export interface PlaceDriver {
  id: string;
  name: string;
  status: 'active' | 'blocked';
  isGuest: boolean;
}

/**
 * What stands between a logged-in driver and a plug (module 19): the operator's record of
 * them, the site's visibility, who pays, and whether a hold could be taken.
 */
export interface DriverPlaceAccess {
  tenantId: string;
  /** Null when the operator has no record of this login: charging needs the driver's consent first. */
  driver: PlaceDriver | null;
  visibility: 'public' | 'private';
  isMemberAtSite: boolean;
  account: PaymentAccountRow | null;
  /** The provider is configured and the operator's account may take payments. */
  isPaymentAccepted: boolean;
  rule: ResolvedPaymentRule;
  card: UsableSavedCard | null;
}

/** Why a start is refused; `null` means the driver may charge. */
export type DriverChargeRefusal =
  | 'driver_blocked'
  | 'private_site'
  | 'plug_unavailable'
  | 'no_tariff'
  | 'payments_not_accepted'
  | 'no_payment_method';

/** The plug's state as far as the start is concerned. */
export interface PlugState {
  availability: PlaceAvailability;
  hasTariff: boolean;
}

/** Decides a start from the app the way the gateway decides a card tap (module 19, decision 1). */
export class DriverPlaceAccessPolicy {
  static readonly WORDS: Record<DriverChargeRefusal, string> = {
    driver_blocked: 'This operator has blocked your driver record.',
    private_site: 'This site is private; only its members may charge here.',
    plug_unavailable: 'This plug cannot be used right now.',
    no_tariff: 'This operator has no price for this plug yet.',
    payments_not_accepted: 'This operator does not take card payments yet.',
    no_payment_method:
      'Save a card to your account first: this operator charges for sessions here.',
  };

  /** A paid session needs a price, a payment account and a saved card; a free one needs none. */
  static refusal(access: DriverPlaceAccess, plug: PlugState): DriverChargeRefusal | null {
    if (access.driver?.status === 'blocked') {
      return 'driver_blocked';
    }
    if (access.visibility === 'private' && !access.isMemberAtSite) {
      return 'private_site';
    }
    if (plug.availability !== 'available') {
      return 'plug_unavailable';
    }
    if (access.rule.outcome === 'free') {
      return null;
    }
    if (!plug.hasTariff) {
      return 'no_tariff';
    }
    if (!access.isPaymentAccepted) {
      return 'payments_not_accepted';
    }
    return access.card ? null : 'no_payment_method';
  }
}
