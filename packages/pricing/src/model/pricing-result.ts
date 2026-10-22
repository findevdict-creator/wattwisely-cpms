export type LineKind = 'start_fee' | 'energy' | 'time' | 'idle' | 'adjustment';

/** What a line's quantity counts: Wh, minutes, or the session itself (fees and adjustments). */
export type LineUnit = 'wh' | 'min' | 'session';

/** One line of the receipt. Amounts are integer minor units, rounded half up per line. */
export interface LineItem {
  kind: LineKind;
  bandName: string | null;
  from: Date | null;
  to: Date | null;
  quantity: number;
  unit: LineUnit;
  /** In ten-thousandths of a major unit per kWh, hour or minute; null for a fee or an adjustment. */
  unitPrice: number | null;
  net: number;
  tax: number;
  gross: number;
}

/** The priced session: its lines, totals, and what is needed to reproduce the result later. */
export interface PricingResult {
  engineVersion: string;
  /** A hash of the whole input; the same input always gives the same hash and result. */
  inputHash: string;
  currency: string;
  lines: LineItem[];
  netTotal: number;
  taxTotal: number;
  /** What is captured on the card. */
  grossTotal: number;
  energyWh: number;
  chargingMinutes: number;
  idleMinutes: number;
  /** Idle minutes after the grace period. */
  billableIdleMinutes: number;
  /** Why a person should look at this session before it is captured, e.g. "long_session". */
  flags: string[];
}
