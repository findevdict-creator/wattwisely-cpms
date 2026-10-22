import { StoredTariffBand } from '@wattwisely/db';
import { BandMatcher, LocalClock } from '@wattwisely/pricing';

/** Which price band is in force at a site right now, so the QR page can say "now 0.40 per kWh". */
export class CurrentBandFinder {
  /** The band's name, or null when the bands leave this moment uncovered. */
  static nameAt(bands: StoredTariffBand[], timeZone: string, now: Date): string | null {
    const parts = new LocalClock(timeZone).partsOf(now);
    try {
      return new BandMatcher(bands).match(parts.weekday, parts.secondOfDay).name;
    } catch {
      return null;
    }
  }
}
