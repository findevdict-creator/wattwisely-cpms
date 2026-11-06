import { DriverCharge } from '../api/models/driver-payments';

/** The name a charge's receipt PDF is saved under, the same in both apps (module 36). */
export class ReceiptFileName {
  /** "receipt-2026-10-21-riverside-car-park.pdf". */
  static of(charge: DriverCharge): string {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: charge.time_zone }).format(
      new Date(charge.started_at),
    );
    const site = charge.site_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `receipt-${day}${site ? `-${site}` : ''}.pdf`;
  }
}
