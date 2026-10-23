import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner, UuidV7 } from '@wattwisely/db';
import {
  PaymentRow,
  PaymentStatuses,
  PaymentStore,
  RefundPolicy,
  RefundRow,
  RefundStatus,
  RefundStore,
} from '@wattwisely/payments';
import { AuditRecorder } from '../../../common/audit/audit.recorder';
import { PermissionKey } from '../../../common/permissions/permission-catalog';
import { SitePermissionChecker } from '../../../common/permissions/site-permission.checker';
import { RequestAuth } from '../../../common/request/request-auth';
import { TenantAccess } from '../../../common/tenant/tenant-access';
import { PaymentErrors } from '../payment-errors';
import { PaymentsService } from '../payments/payments.service';
import { CreateRefundRequestDto } from './dto/create-refund-request.dto';
import { ListRefundsQueryDto } from './dto/list-refunds-query.dto';
import { RefundDto } from './dto/refund.dto';
import { RefundExecutor } from './refund-executor';

/**
 * Refunds (Stripe Payments design, "Refunds"): staff with payments:refund at the site give
 * back part or all of a captured payment. Above the limit a second person with
 * payments:approve_refund must approve it, and never the requester themselves.
 */
@Injectable()
export class RefundsService {
  static readonly STATUSES: RefundStatus[] = [
    'awaiting_approval',
    'pending',
    'succeeded',
    'failed',
    'cancelled',
  ];
  private readonly payments = new PaymentStore();
  private readonly refunds = new RefundStore();

  constructor(
    private readonly runner: TransactionRunner,
    private readonly reader: PaymentsService,
    private readonly executor: RefundExecutor,
    private readonly audit: AuditRecorder,
  ) {}

  async request(auth: RequestAuth, paymentId: string, body: CreateRefundRequestDto) {
    const access = auth.requireAccess();
    const account = auth.requireAccount();
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), async (tx) => {
      const payment = await this.lockVisible(tx, access, 'payments:refund', paymentId);
      await this.checkAmount(tx, payment, body.amount);
      const isApprovalNeeded = RefundPolicy.needsApproval(body.amount);
      let refund = await this.refunds.insert(tx, {
        id: UuidV7.create(),
        tenantId: access.tenant.id,
        paymentId: payment.id,
        sessionId: payment.sessionId,
        amount: body.amount,
        currency: payment.currency,
        reason: body.reason,
        status: isApprovalNeeded ? 'awaiting_approval' : 'pending',
        requestedBy: account.id,
        requestedByLabel: account.label,
      });
      if (!isApprovalNeeded) {
        refund = await this.executor.execute(tx, payment, refund);
      }
      await this.record(tx, auth, 'payments.refund_requested', refund);
      return new RefundDto(refund);
    });
  }

  async approve(auth: RequestAuth, refundId: string): Promise<RefundDto> {
    const access = auth.requireAccess();
    const account = auth.requireAccount();
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), async (tx) => {
      const waiting = await this.lockAwaiting(tx, access, 'payments:approve_refund', refundId);
      if (!RefundPolicy.canApprove(waiting, account.id)) {
        throw PaymentErrors.ownRefund();
      }
      const payment = await this.payments.findForUpdate(tx, waiting.paymentId);
      if (!payment) {
        throw PaymentErrors.notFound();
      }
      await this.refunds.update(tx, waiting.id, {
        status: 'pending',
        approvedBy: account.id,
        approvedByLabel: account.label,
        approvedAt: new Date(),
      });
      const approved = (await this.refunds.findById(tx, waiting.id)) ?? waiting;
      const refund = await this.executor.execute(tx, payment, approved);
      await this.record(tx, auth, 'payments.refund_approved', refund);
      return new RefundDto(refund);
    });
  }

  async cancel(auth: RequestAuth, refundId: string): Promise<RefundDto> {
    const access = auth.requireAccess();
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), async (tx) => {
      const waiting = await this.lockAwaiting(tx, access, 'payments:refund', refundId);
      await this.refunds.update(tx, waiting.id, { status: 'cancelled', completedAt: new Date() });
      const refund = (await this.refunds.findById(tx, waiting.id)) ?? waiting;
      await this.record(tx, auth, 'payments.refund_cancelled', refund);
      return new RefundDto(refund);
    });
  }

  async list(access: TenantAccess, query: ListRefundsQueryDto): Promise<RefundDto[]> {
    const statuses = query.status ? RefundsService.statusesOf(query.status) : undefined;
    const rows = await this.reader.listRefunds(access, statuses, query.limit ?? 50);
    return rows.map((row) => new RefundDto(row));
  }

  private async lockVisible(
    tx: Transaction,
    access: TenantAccess,
    key: PermissionKey,
    paymentId: string,
  ): Promise<PaymentRow> {
    const visible = await this.reader.requireVisible(tx, access, 'payments:read', paymentId);
    SitePermissionChecker.requireAt(access, key, visible.siteId);
    const payment = await this.payments.findForUpdate(tx, paymentId);
    if (!payment) {
      throw PaymentErrors.notFound();
    }
    return payment;
  }

  private async lockAwaiting(
    tx: Transaction,
    access: TenantAccess,
    key: PermissionKey,
    refundId: string,
  ): Promise<RefundRow> {
    const refund = UuidV7.isUuid(refundId) ? await this.refunds.findForUpdate(tx, refundId) : null;
    if (!refund) {
      throw PaymentErrors.refundNotFound();
    }
    const visible = await this.reader.requireVisible(tx, access, 'payments:read', refund.paymentId);
    SitePermissionChecker.requireAt(access, key, visible.siteId);
    if (refund.status !== 'awaiting_approval') {
      throw PaymentErrors.refundNotAwaiting();
    }
    return refund;
  }

  private async checkAmount(tx: Transaction, payment: PaymentRow, amount: number): Promise<void> {
    if (!PaymentStatuses.isRefundable(payment.status)) {
      throw PaymentErrors.notRefundable();
    }
    const reserved = await this.refunds.reservedAmount(tx, payment.id);
    const available = RefundPolicy.available(payment, reserved);
    if (amount > available) {
      throw PaymentErrors.refundTooLarge(available);
    }
  }

  private async record(tx: Transaction, auth: RequestAuth, action: string, refund: RefundRow) {
    await this.audit.record(tx, auth, {
      action,
      targetType: 'refund',
      targetId: refund.id,
      targetLabel: `${refund.amount} ${refund.currency}`,
      after: { status: refund.status, payment_id: refund.paymentId, amount: refund.amount },
    });
  }

  private static statusesOf(text: string): RefundStatus[] {
    const values = text.split(',');
    const unknown = values.find(
      (value) => !RefundsService.STATUSES.includes(value as RefundStatus),
    );
    if (unknown !== undefined) {
      throw PaymentErrors.invalidStatus(unknown);
    }
    return values as RefundStatus[];
  }
}
