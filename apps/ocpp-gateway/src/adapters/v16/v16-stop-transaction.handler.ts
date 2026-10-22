import { Injectable, Logger } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { SessionRow, SessionStates } from '@wattwisely/session-engine';
import { ChargerConnection } from '../../connection/charger-connection';
import { SessionRecorder } from '../../sessions/session-recorder';
import { GatewayRepositories } from '../../storage/gateway-repositories';
import { ActionHandler, HandlerResult } from '../action-handler';
import { V16MeterReader } from './v16-meter-reader';
import { StopTransactionRequest } from './v16-messages';

/**
 * StopTransaction: records the final meter reading and reason and moves the session to
 * stopping; the worker prices it once the car has left. When the reason says the car
 * was unplugged, that is recorded too. An unknown or repeated stop is answered anyway.
 */
@Injectable()
export class V16StopTransactionHandler implements ActionHandler {
  static readonly UNPLUG_REASONS = ['EVDisconnected', 'EmergencyStop'];

  readonly action = 'StopTransaction';

  private readonly logger = new Logger(V16StopTransactionHandler.name);

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly store: GatewayRepositories,
    private readonly recorder: SessionRecorder,
  ) {}

  async handle(connection: ChargerConnection, payload: unknown): Promise<HandlerResult> {
    const stop = payload as StopTransactionRequest;
    const charger = connection.charger;
    await this.transactionRunner.run(DatabaseSession.forTenant(charger.tenantId), async (tx) => {
      await this.store.chargers.touch(tx, charger.id);
      const session = await this.store.sessions.findByTransactionId(
        tx,
        charger.id,
        stop.transactionId,
      );
      if (!session) {
        this.logger.warn(`${charger.identity} stopped unknown transaction ${stop.transactionId}`);
        return;
      }
      if (session.endedAt === null && !SessionStates.isEnd(session.status)) {
        await this.close(tx, connection, session, stop);
      }
    });
    return { reply: stop.idTag ? { idTagInfo: { status: 'Accepted' } } : {} };
  }

  private async close(
    tx: Transaction,
    connection: ChargerConnection,
    session: SessionRow,
    stop: StopTransactionRequest,
  ): Promise<void> {
    const charger = connection.charger;
    const endedAt = new Date(stop.timestamp);
    await this.store.sessions.stop(tx, session, {
      endedAt,
      meterStopWh: stop.meterStop,
      stopReason: stop.reason ?? null,
    });
    await this.store.meterValues.insertMany(
      tx,
      { id: session.id, tenantId: charger.tenantId, chargerId: charger.id },
      V16MeterReader.read(stop.transactionData ?? []),
    );
    if (V16StopTransactionHandler.UNPLUG_REASONS.includes(stop.reason ?? '')) {
      await this.store.sessions.markUnplugged(tx, session.id, endedAt);
    }
    const energyWh = Math.max(0, stop.meterStop - (session.meterStartWh ?? 0));
    await this.recorder.move(tx, session, 'transaction_ended', {
      occurredAt: endedAt,
      energyWh,
      details: { reason: stop.reason ?? null },
      extra: { stop_reason: stop.reason ?? null },
      isAnnouncedAnyway: true,
    });
  }
}
