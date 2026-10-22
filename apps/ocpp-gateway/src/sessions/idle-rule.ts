import { SessionRow } from '@wattwisely/session-engine';

/**
 * When a charging session counts as idle (Sessions and Pricing design, open question,
 * assumed here): a reading shows no new energy for two minutes since the last increase.
 * The idle time starts at that reading, never earlier, so a slow meter is never billed
 * as idle. A charger that reports SuspendedEV is idle at once.
 */
export class IdleRule {
  static readonly AFTER_MS = 2 * 60 * 1000;

  static isIdleAt(session: SessionRow, readingAt: Date): boolean {
    const lastIncrease = session.energyIncreasedAt ?? session.startedAt;
    return readingAt.getTime() - lastIncrease.getTime() >= IdleRule.AFTER_MS;
  }
}
