import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { MailContent } from '@wattwisely/mail';
import { OutboxKind } from '../notifications/outbox-entry';
import { OutboxWriter } from '../notifications/outbox.writer';
import { DriverEventRules } from './driver-event.rules';
import { DriverProgressComposer } from './driver-progress.composer';
import { ReceiptComposer } from './receipt.composer';
import { WatchedSession } from './watched-session';
import { WatchedSessionsRepository } from './watched-sessions.repository';

/**
 * Writes the driver e-mails one tenant's sessions are due to the outbox, in one transaction.
 * The dedupe key "session:<id>:<kind>" keeps each e-mail once-only (NTF-01).
 */
@Injectable()
export class SessionNotifier {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly sessions: WatchedSessionsRepository,
    private readonly outbox: OutboxWriter,
  ) {}

  /** How many e-mails were queued. */
  run(tenantId: string, now: Date): Promise<number> {
    return this.runner.run(DatabaseSession.forTenant(tenantId), async (tx) => {
      let queued = 0;
      for (const session of await this.sessions.findWatched(tx, now)) {
        for (const kind of DriverEventRules.due(session, now)) {
          const isNew = await this.outbox.enqueue(tx, {
            tenantId,
            kind,
            dedupeKey: `session:${session.sessionId}:${kind}`,
            toAddress: session.email,
            sessionId: session.sessionId,
            content: await this.content(tx, kind, session),
          });
          queued += isNew ? 1 : 0;
        }
      }
      return queued;
    });
  }

  private async content(
    tx: Transaction,
    kind: OutboxKind,
    session: WatchedSession,
  ): Promise<MailContent> {
    switch (kind) {
      case 'session_started':
        return DriverProgressComposer.started(session);
      case 'session_nearly_full':
        return DriverProgressComposer.nearlyFull(session);
      case 'session_charging_finished':
        return DriverProgressComposer.finished(session);
      case 'session_idle_fee_soon':
        return DriverProgressComposer.idleFeeSoon(session);
      default:
        return ReceiptComposer.receipt(
          session,
          await this.sessions.findLines(tx, session.sessionId),
        );
    }
  }
}
