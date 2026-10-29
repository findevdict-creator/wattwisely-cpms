import { Money, ReceiptLine } from '@wattwisely/driver-core';

/**
 * The receipt's lines as the design's "Charging complete" writes them: "10.0 kWh off-peak ×
 * €0.30", "Idle 10 min × €0.10", "Start fee", each with what it cost.
 */
export class ReceiptRows {
  static of(lines: ReceiptLine[], currency: string): { label: string; value: string }[] {
    return lines.map((line) => ({
      label: ReceiptRows.label(line, currency),
      value: Money.format(line.gross, currency),
    }));
  }

  private static label(line: ReceiptLine, currency: string): string {
    const price = line.unit_price ? ` × ${Money.unitPrice(line.unit_price, currency)}` : '';
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
}
