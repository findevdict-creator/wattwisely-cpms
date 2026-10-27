import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { SessionRow, SessionStates } from '@wattwisely/session-engine';
import { SessionRecorder } from '../../sessions/session-recorder';
import { ChargerIdentity } from '../../storage/charger-identity';
import { GatewayRepositories } from '../../storage/gateway-repositories';
import { MeterReading } from '../../storage/meter-values.repository';
import { MeterReader } from '../meter-reader';
import { V201MeterReader } from './v201-meter-reader';
import { TransactionEventRequest201 } from './v201-messages';

/** What the Ended event settles about a session. */
export interface TransactionEnd {
  endedAt: Date;
  reason: string | null;
  readings: MeterReading[];
  meterStartWh: number;
  meterStopWh: number;
}

/**
 * The Ended event: the final reading (the Transaction.End sample, or the latest the
 * event carries) and the stoppedReason close the session, which moves to stopping for
 * the worker to price once the car has left, as a 1.6 StopTransaction does. A reason
 * that says the car was unplugged is recorded too. A repeated Ended changes nothing.
 */
@Injectable()
export class V201TransactionEnder {
  static readonly UNPLUG_REASONS = ['EVDisconnected', 'EmergencyStop'];

  constructor(
    private readonly store: GatewayRepositories,
    private readonly recorder: SessionRecorder,
  ) {}

  async end(
    tx: Transaction,
    charger: ChargerIdentity,
    session: SessionRow,
    event: TransactionEventRequest201,
  ): Promise<void> {
    if (session.endedAt !== null || SessionStates.isEnd(session.status)) {
      return;
    }
    const end = V201TransactionEnder.endOf(session, event);
    const stop = { endedAt: end.endedAt, meterStopWh: end.meterStopWh, stopReason: end.reason };
    await this.store.sessions.stop(tx, { ...session, meterStartWh: end.meterStartWh }, stop);
    const owner = { id: session.id, tenantId: charger.tenantId, chargerId: charger.id };
    await this.store.meterValues.insertMany(tx, owner, end.readings);
    if (V201TransactionEnder.UNPLUG_REASONS.includes(end.reason ?? '')) {
      await this.store.sessions.markUnplugged(tx, session.id, end.endedAt);
    }
    await this.recorder.move(tx, session, 'transaction_ended', {
      occurredAt: end.endedAt,
      energyWh: Math.max(0, end.meterStopWh - end.meterStartWh),
      details: { reason: end.reason },
      extra: { stop_reason: end.reason },
      isAnnouncedAnyway: true,
    });
  }

  /**
   * The numbers the end is recorded with. A session that never got a reading starts where
   * this event's earliest one says, or at zero; without a final reading the stop is the
   * start plus what was counted so far.
   */
  static endOf(session: SessionRow, event: TransactionEventRequest201): TransactionEnd {
    const readings = V201MeterReader.read(event.meterValue ?? []);
    const meterStartWh = session.meterStartWh ?? MeterReader.earliestEnergy(readings)?.meterWh ?? 0;
    return {
      endedAt: new Date(event.timestamp),
      reason: event.transactionInfo.stoppedReason ?? null,
      readings,
      meterStartWh,
      meterStopWh: MeterReader.latestEnergy(readings)?.meterWh ?? meterStartWh + session.energyWh,
    };
  }
}
