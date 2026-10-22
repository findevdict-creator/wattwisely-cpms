import { Injectable } from '@nestjs/common';
import { meterValues, SampledValue, Transaction, UuidV7 } from '@wattwisely/db';

/** One reading as the meter reader extracted it from a MeterValues message. */
export interface MeterReading {
  measuredAt: Date;
  energyWh: number | null;
  powerW: number | null;
  socPercent: number | null;
  samples: SampledValue[];
}

/** Appends readings to meter_values; a reading the charger resends is stored once. */
@Injectable()
export class MeterValuesRepository {
  async insertMany(
    tx: Transaction,
    session: { id: string; tenantId: string; chargerId: string },
    readings: MeterReading[],
  ): Promise<void> {
    if (readings.length === 0) {
      return;
    }
    await tx
      .insert(meterValues)
      .values(
        readings.map((reading) => ({
          id: UuidV7.create(),
          tenantId: session.tenantId,
          chargerId: session.chargerId,
          sessionId: session.id,
          ...reading,
        })),
      )
      .onConflictDoNothing();
  }
}
