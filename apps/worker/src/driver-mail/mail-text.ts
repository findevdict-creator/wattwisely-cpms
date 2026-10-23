import { BandMatcher, LocalClock, Rate } from '@wattwisely/pricing';
import { MoneyText } from '@wattwisely/reports';
import { WatchedSession } from './watched-session';

/** Times and prices as the driver e-mails write them, in the site's time zone. */
export class MailText {
  /** "17:55". */
  static time(at: Date, timeZone: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
    }).format(at);
  }

  /** "10 Mar 2026, 17:55". */
  static dateTime(at: Date, timeZone: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(at);
  }

  /** A unit price in ten-thousandths as "GBP 0.10", keeping up to four decimals. */
  static rate(rate: number, currency: string): string {
    const text = Rate.toDecimal(rate)
      .toFixed(4)
      .replace(/0{1,2}$/, '');
    return `${currency} ${text}`;
  }

  static kwh(energyWh: number): string {
    return `${(energyWh / 1000).toFixed(2)} kWh`;
  }

  /** "GBP 0.10 per minute, at most GBP 10.00", from the band in force at `at`. */
  static idleFee(session: WatchedSession, at: Date): string {
    const tariff = session.tariff;
    const currency = session.currency ?? '';
    if (!tariff) {
      return '';
    }
    const parts = new LocalClock(session.timeZone).partsOf(at);
    let perMinute = 0;
    try {
      perMinute = new BandMatcher(tariff.bands).match(
        parts.weekday,
        parts.secondOfDay,
      ).idleFeePerMinute;
    } catch {
      perMinute = Math.max(...tariff.bands.map((band) => band.idleFeePerMinute));
    }
    const cap =
      tariff.idleFeeCap === null
        ? ''
        : `, at most ${MoneyText.withCode(tariff.idleFeeCap, currency)}`;
    return `${MailText.rate(perMinute, currency)} per minute${cap}`;
  }
}
