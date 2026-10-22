import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { ConnectorStatus } from '@wattwisely/ocpp-contracts';
import { SessionEvent } from '@wattwisely/session-engine';
import { SessionsRepository } from '../storage/sessions.repository';
import { SessionRecorder } from './session-recorder';

/**
 * What a connector status means for the session on it: SuspendedEVSE pauses it,
 * SuspendedEV makes it idle (the car stopped drawing), Charging resumes it, and
 * Available means the car has left, which ends the idle time.
 */
@Injectable()
export class ConnectorSessionEffects {
  static readonly EVENTS: Partial<Record<ConnectorStatus, SessionEvent[]>> = {
    suspended_evse: ['suspended'],
    suspended_ev: ['energy_stopped'],
    charging: ['resumed', 'energy_resumed'],
    available: ['unplugged'],
  };

  constructor(
    private readonly sessions: SessionsRepository,
    private readonly recorder: SessionRecorder,
  ) {}

  async apply(tx: Transaction, connectorId: string, status: ConnectorStatus, at: Date) {
    const events = ConnectorSessionEffects.EVENTS[status];
    if (!events) {
      return;
    }
    const session = await this.sessions.findOnConnector(
      tx,
      connectorId,
      SessionsRepository.UNFINISHED,
    );
    if (!session) {
      return;
    }
    if (status === 'available') {
      await this.sessions.markUnplugged(tx, session.id, at);
    } else {
      await this.sessions.touch(tx, session.id);
    }
    for (const event of events) {
      if (await this.recorder.move(tx, session, event, { occurredAt: at })) {
        return;
      }
    }
  }
}
