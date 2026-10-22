/** Energy delivered since the session started, in Wh, at one moment (a cleaned, cumulative series). */
export interface MeterPoint {
  at: Date;
  wh: number;
}

/** A span of time, `from` inclusive to `to` exclusive. */
export interface Period {
  from: Date;
  to: Date;
}

/**
 * What a session did, as the pricing engine reads it (the PricingInput's usage half):
 * the cleaned meter series, when energy flowed and when the car sat idle.
 */
export interface PricingUsage {
  startedAt: Date;
  /** When the charge ended (the transaction stopped), or now for a running session. */
  endedAt: Date;
  series: MeterPoint[];
  /** When energy flowed: the time price applies here. */
  chargingPeriods: Period[];
  /** From when energy stopped flowing until unplugged: the idle fee applies here, after the grace. */
  idlePeriods: Period[];
  /** Problems found while cleaning the meter data, carried into the result. */
  flags: string[];
}
