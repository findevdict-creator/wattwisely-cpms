import { ChargeChips, DriverCharge } from '@wattwisely/driver-core';

/** The charges of one month, as a heading and the rows under it. */
export interface ChargeMonth {
  label: string;
  charges: DriverCharge[];
}

/** "Your charges" laid out: grouped by month, filtered by operator, each with its state in words. */
export class ChargeHistory {
  /** The operators the charges were at, in the order they first appear, for the filter. */
  static operators(charges: DriverCharge[]): { id: string; name: string }[] {
    const names = new Map<string, string>();
    for (const charge of charges) {
      names.set(charge.tenant_id, names.get(charge.tenant_id) ?? charge.operator_name);
    }
    return [...names].map(([id, name]) => ({ id, name }));
  }

  /** Newest first, as the API lists them, under "October 2026" and so on; '' keeps every operator. */
  static months(charges: DriverCharge[], tenantId: string): ChargeMonth[] {
    const months: ChargeMonth[] = [];
    for (const charge of charges.filter((item) => !tenantId || item.tenant_id === tenantId)) {
      const label = ChargeHistory.monthOf(charge);
      const last = months[months.length - 1];
      if (last?.label === label) {
        last.charges.push(charge);
      } else {
        months.push({ label, charges: [charge] });
      }
    }
    return months;
  }

  /** "Done · You pay", or what went wrong with the card. */
  static state(charge: DriverCharge): string {
    if (charge.payment?.status === 'failed') {
      return 'Card refused · nothing taken';
    }
    const words = [ChargeChips.session(charge.status).label, charge.payment_rule?.words];
    return words.filter((word) => word).join(' · ');
  }

  static isRefused(charge: DriverCharge): boolean {
    return charge.payment?.status === 'failed';
  }

  private static monthOf(charge: DriverCharge): string {
    return new Intl.DateTimeFormat('en-GB', {
      month: 'long',
      year: 'numeric',
      timeZone: charge.time_zone,
    }).format(new Date(charge.started_at));
  }
}
