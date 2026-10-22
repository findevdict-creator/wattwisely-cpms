import { Injectable, Logger } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { SessionRow, SessionState, SessionStore } from '@wattwisely/session-engine';

/** What a job does with one session, in that session's own transaction; true when it changed it. */
export type SessionWork = (tx: Transaction, session: SessionRow) => Promise<boolean>;

/**
 * Runs a job's work on sessions one by one, each in its own transaction with the row
 * locked. A session another worker holds is skipped this time, and an error on one
 * session is logged without stopping the others.
 */
@Injectable()
export class SessionBatch {
  private readonly logger = new Logger(SessionBatch.name);

  constructor(
    private readonly runner: TransactionRunner,
    private readonly sessions: SessionStore,
  ) {}

  /** The ids of the tenant's sessions that `find` picks. */
  async ids(
    tenantId: string,
    find: (tx: Transaction, sessions: SessionStore) => Promise<string[]>,
  ): Promise<string[]> {
    return this.runner.run(DatabaseSession.forTenant(tenantId), (tx) => find(tx, this.sessions));
  }

  async each(tenantId: string, ids: string[], work: SessionWork): Promise<number> {
    let changed = 0;
    for (const id of ids) {
      try {
        const isChanged = await this.runner.run(DatabaseSession.forTenant(tenantId), async (tx) => {
          const session = await this.sessions.findForUpdate(tx, id);
          return session ? work(tx, session) : false;
        });
        changed += isChanged ? 1 : 0;
      } catch (error) {
        this.logger.error(`Session ${id}: ${(error as Error).message}`);
      }
    }
    return changed;
  }

  /** The ids in these states, then the work on each. */
  async inStates(tenantId: string, states: SessionState[], work: SessionWork): Promise<number> {
    const ids = await this.ids(tenantId, (tx, sessions) => sessions.idsIn(tx, states, 1000));
    return this.each(tenantId, ids, work);
  }
}
