import { ChargeChips, DriverCharge, DurationPipe, Money } from '@wattwisely/driver-core';

/**
 * A charge in the words of the design's "My sessions" and "Session detail" (Figma 11):
 * "21 Oct · Riverside Car Park", "Acme Charging · 22.0 kWh · 41 min", "Charge on 21 Oct".
 * Dates are in the site's time zone, as the receipt has them.
 */
export class SessionWords {
  private static readonly SOURCES: Record<string, string> = {
    account: 'started from the app',
    rfid_card: 'started with a charging card',
    guest_card: 'started on the charger’s web page',
    chat: 'started from a chat',
    staff: 'started by the operator',
  };

  static title(charge: DriverCharge): string {
    return `${SessionWords.day(charge)} · ${charge.site_name}`;
  }

  static line(charge: DriverCharge, now = Date.now()): string {
    const duration = new DurationPipe().transform(charge.started_at, charge.ended_at, now);
    return `${charge.operator_name} · ${SessionWords.energy(charge)} · ${duration}`;
  }

  /** What it cost; "Free" when the operator paid, "—" while it is not worked out. */
  static amount(charge: DriverCharge): string {
    if (!charge.is_paid && charge.amount === null) {
      return 'Free';
    }
    return Money.format(charge.amount, charge.currency);
  }

  static heading(charge: DriverCharge): string {
    return `Charge on ${SessionWords.day(charge)}`;
  }

  /** "21 Oct 2026, 18:02 to 18:43 · started from the app". */
  static period(charge: DriverCharge): string {
    const start = SessionWords.format(charge, { dateStyle: 'medium', timeStyle: 'short' });
    const end = charge.ended_at ? ` to ${SessionWords.time(charge, charge.ended_at)}` : '';
    const source = SessionWords.SOURCES[charge.start_source ?? ''];
    return `${start}${end}${source ? ` · ${source}` : ''}`;
  }

  static energy(charge: DriverCharge): string {
    return `${(charge.energy_wh / 1000).toFixed(1)} kWh`;
  }

  /** A charge still under way opens the live page; a finished one its receipt. */
  static link(charge: DriverCharge): string[] {
    return ChargeChips.isUnderWay(charge.status)
      ? ['/charges', charge.id]
      : ['/sessions', charge.id];
  }

  private static day(charge: DriverCharge): string {
    return SessionWords.format(charge, { day: '2-digit', month: 'short' });
  }

  private static time(charge: DriverCharge, at: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeStyle: 'short',
      timeZone: charge.time_zone,
    }).format(new Date(at));
  }

  private static format(charge: DriverCharge, options: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: charge.time_zone }).format(
      new Date(charge.started_at),
    );
  }
}
