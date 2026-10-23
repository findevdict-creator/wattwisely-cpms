import { Charge } from '../api/models/charge';

/** What the app keeps about a charge on this phone, so the driver can find it again. */
export interface RememberedCharge {
  key: string;
  /** The operator's name as its brand shows it. */
  operator_name: string;
  site_name: string;
  charger_identity: string;
  connector_label: string;
  started_at: string;
  session_status: Charge['session_status'];
  currency: string;
  amount: number | null;
}

/** Builds the remembered form of a charge as the API last described it. */
export class RememberedCharges {
  static of(charge: Charge): RememberedCharge {
    return {
      key: charge.charge_key,
      operator_name: charge.branding?.name || charge.operator_name,
      site_name: charge.site_name,
      charger_identity: charge.charger_identity,
      connector_label: charge.connector_label,
      started_at: charge.started_at,
      session_status: charge.session_status,
      currency: charge.currency,
      amount: charge.amount,
    };
  }
}
