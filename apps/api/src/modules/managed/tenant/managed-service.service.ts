import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { RequestAuth } from '../../../common/request/request-auth';
import { AcceptManagedServiceRequestDto } from '../dto/accept-managed-service-request.dto';
import { ManagedNoticeRequestDto } from '../dto/managed-notice-request.dto';
import { ManagedServiceDto } from '../dto/managed-service.dto';
import { ManagedServiceNotifier } from '../mail/managed-service.notifier';
import { ManagedNoticePolicy } from '../managed-notice.policy';
import { ManagedServiceDescriber } from '../managed-service.describer';
import { ManagedServiceWriter } from '../managed-service.writer';
import { ManagedServiceErrors } from '../managed-service-errors';
import { ManagedTenantTransaction } from './managed-tenant.transaction';

/**
 * The tenant's side of the managed service (stories MGT-01 and MGT-05): seeing the
 * agreement, accepting it, and giving notice. Only the Owner holds managed_service:manage.
 * After a change every member's cached access is dropped, so the tier shows at once.
 */
@Injectable()
export class ManagedServiceService {
  constructor(
    private readonly transaction: ManagedTenantTransaction,
    private readonly describer: ManagedServiceDescriber,
    private readonly writer: ManagedServiceWriter,
    private readonly notifier: ManagedServiceNotifier,
  ) {}

  get(auth: RequestAuth): Promise<ManagedServiceDto> {
    return this.transaction.read(auth, (tx) =>
      this.describer.describe(tx, this.tenantOf(auth), false),
    );
  }

  /** The Owner accepts: the service starts and the tenant becomes managed. */
  async accept(auth: RequestAuth, request: AcceptManagedServiceRequestDto) {
    if (request.accept_terms !== true) {
      throw ManagedServiceErrors.termsNotAccepted();
    }
    return this.change(auth, async (tx) => {
      const service = await this.describer.requireLive(tx, this.tenantOf(auth));
      await this.writer.accept(tx, auth, service);
      return async () => undefined;
    });
  }

  /** The Owner gives notice: the service ends 30 days later at the earliest (story MGT-05). */
  giveNotice(auth: RequestAuth, request: ManagedNoticeRequestDto) {
    const endsAt = ManagedNoticePolicy.endsAtFor(
      request.ends_at ? new Date(request.ends_at) : null,
    );
    return this.change(auth, async (tx) => {
      const tenantId = this.tenantOf(auth);
      const service = await this.describer.requireLive(tx, tenantId);
      await this.writer.giveNotice(tx, auth, service, {
        endsAt,
        reason: request.reason ?? '',
        version: service.version,
        action: 'managed_service.notice_given',
      });
      return this.notifier.noticeGiven(tx, tenantId, endsAt);
    });
  }

  /** One transaction, then the mail it decided on, then the fresh agreement. */
  private async change(
    auth: RequestAuth,
    work: (tx: Transaction) => Promise<() => Promise<void>>,
  ): Promise<ManagedServiceDto> {
    const send = await this.transaction.change(auth, work);
    await send();
    return this.get(auth);
  }

  private tenantOf(auth: RequestAuth): string {
    return auth.requireAccess().tenant.id;
  }
}
