import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { SessionRow, TariffVersionStore } from '@wattwisely/session-engine';
import { ChargerIdentity } from '../storage/charger-identity';
import { SessionStart, SessionsRepository } from '../storage/sessions.repository';
import { SessionRecorder } from './session-recorder';

/**
 * Opens a session at StartTransaction. It copies the site's time zone and the tariff
 * version in force from the charger's site, so later edits never change its price.
 * A paid session (module 6) already exists at `starting` and is waiting for exactly this
 * StartTransaction: it is adopted instead, keeping its hold and its tariff snapshot.
 */
@Injectable()
export class SessionOpener {
  constructor(
    private readonly sessions: SessionsRepository,
    private readonly tariffs: TariffVersionStore,
    private readonly recorder: SessionRecorder,
  ) {}

  async open(tx: Transaction, charger: ChargerIdentity, start: SessionStart): Promise<SessionRow> {
    const waiting = await this.sessions.findWaiting(tx, start.connectorId, start.commandId);
    if (waiting) {
      return this.resume(tx, waiting, start);
    }
    const snapshot = await this.tariffs.snapshotForCharger(tx, charger.id);
    if (!snapshot) {
      throw new Error(`Charger ${charger.identity} has no site`);
    }
    const session = await this.sessions.start(tx, start, snapshot);
    await this.recorder.opened(tx, session);
    return session;
  }

  /** The waiting paid session gets the charger's transaction id and start reading, and starts charging. */
  private async resume(tx: Transaction, waiting: SessionRow, start: SessionStart) {
    const session = await this.sessions.adopt(tx, waiting, start);
    const status = await this.recorder.move(tx, session, 'transaction_started', {
      occurredAt: start.startedAt,
      energyWh: 0,
    });
    return { ...session, status: status ?? session.status };
  }
}
