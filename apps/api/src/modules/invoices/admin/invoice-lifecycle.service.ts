import { Injectable } from '@nestjs/common';
import { InvoiceNumber } from '@wattwisely/billing';
import { Transaction } from '@wattwisely/db';
import { RequestAuth } from '../../../common/request/request-auth';
import { SubscriptionsRepository } from '../../subscription/subscriptions.repository';
import { InvoiceDto } from '../dto/invoice.dto';
import { IssueInvoiceResultDto } from '../dto/issue-invoice-result.dto';
import { PayInvoiceRequestDto } from '../dto/pay-invoice-request.dto';
import { VoidInvoiceRequestDto } from '../dto/void-invoice-request.dto';
import { InvoiceErrors } from '../invoice-errors';
import { InvoiceStatuses, InvoiceWithLines } from '../invoice-record';
import { InvoicesRepository } from '../invoices.repository';
import { InvoiceMailer } from '../mail/invoice.mailer';
import { InvoiceChanger, InvoiceTarget } from './invoice.changer';

/**
 * An invoice's life after the draft (module 15): issued with its number and sent to the
 * billing contact, paid, or void. Each step is one transaction in the tenant with its audit
 * entry; the e-mail goes out after the commit.
 */
@Injectable()
export class InvoiceLifecycleService {
  /** Payment terms: due 30 days after the invoice is issued. */
  static readonly DUE_DAYS = 30;

  constructor(
    private readonly changer: InvoiceChanger,
    private readonly invoices: InvoicesRepository,
    private readonly subscriptions: SubscriptionsRepository,
    private readonly mailer: InvoiceMailer,
  ) {}

  async issue(auth: RequestAuth, target: InvoiceTarget): Promise<IssueInvoiceResultDto> {
    const issued = await this.changer.changeDraft(auth, target, async (tx, record) => {
      const changes = await this.issueChanges(tx, auth, record);
      await this.changer.apply(tx, auth, record.invoice, {
        action: 'admin.invoice_issued',
        changes,
        version: target.version,
        after: { number: changes.number, total: record.invoice.total, due_at: changes.dueAt },
      });
    });
    const isEmailSent = await this.mailer.issued(issued);
    return new IssueInvoiceResultDto(issued, isEmailSent);
  }

  /** The number, the dates and the billing contact as the subscription has it today. */
  private async issueChanges(tx: Transaction, auth: RequestAuth, record: InvoiceWithLines) {
    const now = new Date();
    const subscription = (await this.subscriptions.findByTenant(tx, record.invoice.tenantId))
      ?.subscription;
    const sequence = await this.invoices.nextNumber(tx, now.getUTCFullYear());
    return {
      status: 'issued' as const,
      number: InvoiceNumber.format(now.getUTCFullYear(), sequence),
      issuedAt: now,
      issuedBy: auth.requireAccount().id,
      dueAt: new Date(now.getTime() + InvoiceLifecycleService.DUE_DAYS * 86_400_000),
      billingName: subscription?.billingName ?? record.invoice.billingName,
      billingEmail: subscription?.billingEmail ?? record.invoice.billingEmail,
      billingReference: subscription?.billingReference ?? record.invoice.billingReference,
    };
  }

  pay(auth: RequestAuth, target: InvoiceTarget, body: PayInvoiceRequestDto): Promise<InvoiceDto> {
    return this.changer.change(auth, target, async (tx, record) => {
      if (record.invoice.status !== 'issued') {
        throw InvoiceErrors.wrongStatus('Only an issued invoice can be marked paid.');
      }
      const paidAt = body.paid_at ? new Date(body.paid_at) : new Date();
      await this.changer.apply(tx, auth, record.invoice, {
        action: 'admin.invoice_paid',
        changes: {
          status: 'paid',
          paidAt,
          paidBy: auth.requireAccount().id,
          paymentReference: body.payment_reference?.trim() || null,
        },
        version: target.version,
        after: { paid_at: paidAt.toISOString(), payment_reference: body.payment_reference },
      });
    });
  }

  void(auth: RequestAuth, target: InvoiceTarget, body: VoidInvoiceRequestDto): Promise<InvoiceDto> {
    return this.changer.change(auth, target, async (tx, record) => {
      if (!InvoiceStatuses.canBeVoided(record.invoice.status)) {
        throw InvoiceErrors.wrongStatus('A paid or void invoice cannot be voided.');
      }
      await this.changer.apply(tx, auth, record.invoice, {
        action: 'admin.invoice_voided',
        changes: {
          status: 'void',
          voidedAt: new Date(),
          voidedBy: auth.requireAccount().id,
          voidReason: body.reason.trim(),
        },
        version: target.version,
        after: { reason: body.reason.trim() },
      });
    });
  }
}
