import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner, UuidV7 } from '@wattwisely/db';
import {
  PaymentStatus,
  PaymentStatuses,
  RefundRow,
  RefundStatus,
  RefundStore,
} from '@wattwisely/payments';
import { PageRequest } from '../../../common/paging/page-request';
import { PermissionKey } from '../../../common/permissions/permission-catalog';
import { SitePermissionChecker } from '../../../common/permissions/site-permission.checker';
import { TenantAccess } from '../../../common/tenant/tenant-access';
import { PaymentErrors } from '../payment-errors';
import { RefundDto } from '../refunds/dto/refund.dto';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';
import { PaymentDetailDto } from './dto/payment-detail.dto';
import { PaymentPageDto } from './dto/payment-page.dto';
import { PaymentDto } from './dto/payment.dto';
import { PaymentFilter } from './payment-filter';
import { PaymentRecord } from './payment-record';
import { PaymentsRepository } from './payments.repository';

/** Reads payments. payments:read is site-scoped, like sessions:read: staff see the payments at their sites. */
@Injectable()
export class PaymentsService {
  private readonly refunds = new RefundStore();

  constructor(
    private readonly runner: TransactionRunner,
    private readonly payments: PaymentsRepository,
  ) {}

  async list(access: TenantAccess, query: ListPaymentsQueryDto): Promise<PaymentPageDto> {
    const page = PageRequest.from(query);
    const filter = PaymentsService.filterOf(access, query);
    const records = await this.runner.run(DatabaseSession.forTenant(access.tenant.id), (tx) =>
      this.payments.findPage(tx, filter, page.cursor, page.fetchSize),
    );
    const { items, nextCursor } = page.cut(records, (payment) => payment.createdAt.toISOString());
    return new PaymentPageDto(
      items.map((payment) => new PaymentDto(payment)),
      nextCursor,
    );
  }

  async get(access: TenantAccess, id: string): Promise<PaymentDetailDto> {
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), async (tx) => {
      const payment = await this.requireVisible(tx, access, 'payments:read', id);
      const refunds = await this.refunds.listForPayment(tx, payment.id);
      return new PaymentDetailDto(
        payment,
        refunds.map((refund) => new RefundDto(refund)),
      );
    });
  }

  /** Refunds at the caller's sites, newest first, optionally only in some states. */
  async listRefunds(
    access: TenantAccess,
    statuses: RefundStatus[] | undefined,
    limit: number,
  ): Promise<RefundRow[]> {
    const scope = SitePermissionChecker.scopeOf(access, 'payments:read');
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), (tx) =>
      this.payments.findRefunds(tx, scope, statuses, limit),
    );
  }

  /** The payment, or 404 when it does not exist or lies at a site outside the caller's permission. */
  async requireVisible(
    tx: Transaction,
    access: TenantAccess,
    key: PermissionKey,
    id: string,
  ): Promise<PaymentRecord> {
    const record = UuidV7.isUuid(id) ? await this.payments.findById(tx, id) : null;
    if (!record || !SitePermissionChecker.isAllowedAt(access, key, record.siteId)) {
      throw PaymentErrors.notFound();
    }
    return record;
  }

  private static filterOf(access: TenantAccess, query: ListPaymentsQueryDto): PaymentFilter {
    return {
      scope: SitePermissionChecker.scopeOf(access, 'payments:read'),
      siteId: query.site_id,
      sessionId: query.session_id,
      statuses: query.status ? PaymentsService.statusesOf(query.status) : undefined,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    };
  }

  private static statusesOf(text: string): PaymentStatus[] {
    const values = text.split(',');
    const unknown = values.find((value) => !PaymentStatuses.isStatus(value));
    if (unknown !== undefined) {
      throw PaymentErrors.invalidStatus(unknown);
    }
    return values as PaymentStatus[];
  }
}
