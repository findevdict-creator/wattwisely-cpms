import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { PlatformTransaction } from '../../../common/platform/platform-transaction';
import { RequestAuth } from '../../../common/request/request-auth';
import { ManagedNoticeRequestDto } from '../dto/managed-notice-request.dto';
import { ManagedServiceDto } from '../dto/managed-service.dto';
import { OfferManagedServiceRequestDto } from '../dto/offer-managed-service-request.dto';
import { UpdateManagedServiceRequestDto } from '../dto/update-managed-service-request.dto';
import { ManagedServiceNotifier, PendingMail } from '../mail/managed-service.notifier';
import { ManagedNoticePolicy } from '../managed-notice.policy';
import { ManagedServiceDescriber } from '../managed-service.describer';
import { ManagedServiceWriter } from '../managed-service.writer';

/** A change to an agreement from the admin console, with the version the caller saw. */
export interface ManagedServiceTarget {
  tenantId: string;
  version: number;
}

/**
 * Wattwisely's side of the managed service (stories MGT-01 and MGT-05), from the admin
 * console: offering an agreement, changing its terms, withdrawing it before acceptance,
 * and giving notice. Each change is one transaction with its audit entry in the tenant.
 */
@Injectable()
export class AdminManagedServiceService {
  constructor(
    private readonly platform: PlatformTransaction,
    private readonly describer: ManagedServiceDescriber,
    private readonly writer: ManagedServiceWriter,
    private readonly notifier: ManagedServiceNotifier,
  ) {}

  get(auth: RequestAuth, tenantId: string): Promise<ManagedServiceDto> {
    return this.platform.runInTenant(auth, tenantId, async (tx) => {
      await this.describer.requireTenant(tx, tenantId);
      return this.describer.describe(tx, tenantId, true);
    });
  }

  offer(auth: RequestAuth, tenantId: string, request: OfferManagedServiceRequestDto) {
    return this.change(auth, tenantId, async (tx) => {
      await this.describer.requireTenant(tx, tenantId, true);
      const { staff } = await this.writer.offer(tx, auth, tenantId, request);
      return this.notifier.offered(tx, tenantId, staff.name || staff.email);
    });
  }

  update(auth: RequestAuth, target: ManagedServiceTarget, request: UpdateManagedServiceRequestDto) {
    return this.change(auth, target.tenantId, async (tx) => {
      const service = await this.describer.requireLive(tx, target.tenantId);
      const staff = request.account_manager_id
        ? await this.writer.requireStaff(tx, request.account_manager_id)
        : null;
      await this.writer.update(tx, auth, service, {
        version: target.version,
        changes: {
          accountManagerId: staff?.staffId ?? service.accountManagerId,
          isTariffApprovalRequired:
            request.is_tariff_approval_required ?? service.isTariffApprovalRequired,
          agreementReference: request.agreement_reference?.trim() ?? service.agreementReference,
          notes: request.notes?.trim() ?? service.notes,
        },
      });
      return ManagedServiceNotifier.none();
    });
  }

  /** Before acceptance only: afterwards the service ends with notice. */
  withdraw(auth: RequestAuth, target: ManagedServiceTarget) {
    return this.change(auth, target.tenantId, async (tx) => {
      const service = await this.describer.requireLive(tx, target.tenantId);
      await this.writer.withdraw(tx, auth, service, target.version);
      return ManagedServiceNotifier.none();
    });
  }

  /** Wattwisely gives notice (story MGT-05): the same rules as for the Owner. */
  giveNotice(auth: RequestAuth, target: ManagedServiceTarget, request: ManagedNoticeRequestDto) {
    const endsAt = ManagedNoticePolicy.endsAtFor(
      request.ends_at ? new Date(request.ends_at) : null,
    );
    return this.change(auth, target.tenantId, async (tx) => {
      const service = await this.describer.requireLive(tx, target.tenantId);
      await this.writer.giveNotice(tx, auth, service, {
        endsAt,
        reason: request.reason ?? '',
        version: target.version,
        action: 'admin.managed_service_notice_given',
      });
      return this.notifier.noticeGiven(tx, target.tenantId, endsAt);
    });
  }

  /** One transaction in the tenant, then the mail it decided on, then the fresh agreement. */
  private async change(
    auth: RequestAuth,
    tenantId: string,
    work: (tx: Transaction) => Promise<PendingMail>,
  ): Promise<ManagedServiceDto> {
    const send = await this.platform.runInTenant(auth, tenantId, work);
    await send();
    return this.get(auth, tenantId);
  }
}
