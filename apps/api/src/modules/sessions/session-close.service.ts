import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import {
  SessionFinaliser,
  SessionRow,
  SessionState,
  SessionStates,
  SessionStore,
} from '@wattwisely/session-engine';
import { AuditRecorder } from '../../common/audit/audit.recorder';
import { SitePermissionChecker } from '../../common/permissions/site-permission.checker';
import { RequestAuth } from '../../common/request/request-auth';
import { SessionDetailDto } from './dto/session-detail.dto';
import { SessionErrors } from './session-errors';
import { SessionsService } from './sessions.service';

/**
 * Closes a stuck session by hand (sessions:close_stuck at its site). A session that
 * already stopped gets its final price now instead of waiting for the car to leave;
 * one that is still running (the charger never reported the stop) is marked failed,
 * closed_by_staff, and nobody is charged.
 */
@Injectable()
export class SessionCloseService {
  private readonly store = new SessionStore();
  private readonly finaliser = new SessionFinaliser();

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly reader: SessionsService,
    private readonly audit: AuditRecorder,
  ) {}

  async close(auth: RequestAuth, id: string): Promise<SessionDetailDto> {
    const access = auth.requireAccess();
    return this.transactionRunner.run(DatabaseSession.forTenant(access.tenant.id), async (tx) => {
      const visible = await this.reader.requireVisible(tx, access, id);
      SitePermissionChecker.requireAt(access, 'sessions:close_stuck', visible.siteId);
      const session = await this.store.findForUpdate(tx, id);
      if (!session) {
        throw SessionErrors.busy();
      }
      const status = await this.end(tx, session);
      await this.audit.record(tx, auth, {
        action: 'sessions.closed',
        targetType: 'session',
        targetId: id,
        targetLabel: `${visible.chargerIdentity} #${visible.ocppTransactionId}`,
        before: { status: session.status },
        after: { status },
      });
      return this.reader.detail(tx, await this.reader.requireVisible(tx, access, id));
    });
  }

  private async end(tx: Transaction, session: SessionRow): Promise<SessionState> {
    if (SessionStates.isEnd(session.status)) {
      throw SessionErrors.alreadyClosed();
    }
    const now = new Date();
    const status =
      session.status === 'stopping'
        ? await this.finaliser.finalise(tx, session, now)
        : await this.finaliser.fail(tx, session, 'closed_by_staff', now);
    if (!status) {
      throw SessionErrors.busy();
    }
    return status;
  }
}
