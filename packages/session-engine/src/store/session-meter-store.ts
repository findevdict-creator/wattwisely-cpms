import { and, asc, eq, isNotNull } from 'drizzle-orm';
import { meterValues, Transaction } from '@wattwisely/db';
import { RawReading } from '@wattwisely/pricing';

/** Reads the energy register readings stored for a session. */
export class SessionMeterStore {
  async energyReadings(tx: Transaction, sessionId: string): Promise<RawReading[]> {
    const rows = await tx
      .select({ at: meterValues.measuredAt, meterWh: meterValues.energyWh })
      .from(meterValues)
      .where(and(eq(meterValues.sessionId, sessionId), isNotNull(meterValues.energyWh)))
      .orderBy(asc(meterValues.measuredAt));
    return rows as RawReading[];
  }
}
