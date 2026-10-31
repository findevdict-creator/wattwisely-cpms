import { MoneyText } from '@wattwisely/reports';
import { ReceiptLineDto } from '../../tariffs/dto/receipt-line.dto';
import { DriverChargeDetailDto } from '../charges/dto/driver-charge-detail.dto';

/**
 * The receipt's words for the PDF (module 33), as the app's receipt writes them: "10.0 kWh
 * off-peak × EUR 0.30", "Idle 10 min × EUR 0.10", the dates in the site's time zone.
 */
export class ReceiptText {
  static line(line: ReceiptLineDto, currency: string): string {
    const price = line.unit_price ? ` × ${ReceiptText.unitPrice(line.unit_price, currency)}` : '';
    const band = line.band_name ? ` ${line.band_name}` : '';
    switch (line.kind) {
      case 'energy':
        return `${(line.quantity / 1000).toFixed(1)} kWh${band}${price}`;
      case 'time':
        return `Charging ${Math.round(line.quantity)} min${band}${price}`;
      case 'idle':
        return line.gross === 0
          ? 'Unplugged in time'
          : `Idle ${Math.round(line.quantity)} min${price}`;
      case 'start_fee':
        return 'Start fee';
      default:
        return 'Minimum or maximum price';
    }
  }

  /** "21 Oct 2026, 18:02 to 18:43". */
  static period(charge: DriverChargeDetailDto): string {
    const zone = charge.time_zone;
    const date = new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: zone,
    });
    const time = new Intl.DateTimeFormat('en-GB', { timeStyle: 'short', timeZone: zone });
    const start = date.format(new Date(charge.started_at));
    return charge.ended_at ? `${start} to ${time.format(new Date(charge.ended_at))}` : start;
  }

  static money(amount: number | null, currency: string): string {
    return amount === null ? '—' : MoneyText.withCode(amount, currency);
  }

  /** "Visa •••• 4242", or "your card". */
  static card(charge: DriverChargeDetailDto): string {
    const payment = charge.payment;
    if (!payment?.card_brand || !payment.card_last4) {
      return 'your card';
    }
    const brand = payment.card_brand.charAt(0).toUpperCase() + payment.card_brand.slice(1);
    return `${brand} •••• ${payment.card_last4}`;
  }

  /** "EUR 0.30": the unit price without the trailing zeros beyond the currency's decimals. */
  private static unitPrice(decimal: string, currency: string): string {
    const [whole, fraction = ''] = decimal.split('.');
    const digits = Math.max(2, fraction.replace(/0+$/, '').length);
    return `${currency} ${whole}.${fraction.padEnd(digits, '0').slice(0, digits)}`;
  }
}
