import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { SessionRow, TariffVersionStore } from '@wattwisely/session-engine';
import { ChargerIdentity } from '../storage/charger-identity';
import { SessionStart, SessionsRepository } from '../storage/sessions.repository';
import { SessionRecorder } from './session-recorder';

/**
 * Opens a session at StartTransaction. It copies the site's time zone and the tariff
 * version in force from the charger's site, so later edits never change its price.
 */
@Injectable()
export class SessionOpener {
  constructor(
    private readonly sessions: SessionsRepository,
    private readonly tariffs: TariffVersionStore,
    private readonly recorder: SessionRecorder,
  ) {}

  async open(tx: Transaction, charger: ChargerIdentity, start: SessionStart): Promise<SessionRow> {
    const snapshot = await this.tariffs.snapshotForCharger(tx, charger.id);
    if (!snapshot) {
      throw new Error(`Charger ${charger.identity} has no site`);
    }
    const session = await this.sessions.start(tx, start, snapshot);
    await this.recorder.opened(tx, session);
    return session;
  }
}
