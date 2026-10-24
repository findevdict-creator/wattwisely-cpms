import { Injectable } from '@nestjs/common';
import { BillingPeriod, InvoiceDraftWriter, InvoiceDrafter } from '@wattwisely/billing';
import { ModuleCatalog } from '../../../common/permissions/module-catalog';
import { RequestAuth } from '../../../common/request/request-auth';
import { AdjustmentRequestDto } from '../dto/adjustment-request.dto';
import { InvoiceDto } from '../dto/invoice.dto';
import { InvoiceErrors } from '../invoice-errors';
import { InvoicesRepository } from '../invoices.repository';
import { InvoiceChanger, InvoiceTarget } from './invoice.changer';

/**
 * Changes to a draft before it is issued (module 15): an adjustment line added (a credit,
 * a one-off), a line taken out, or the fee lines worked out again from today's plan, size
 * and prices. Every change bumps the version and is in the tenant's audit log.
 */
@Injectable()
export class InvoiceDraftService {
  constructor(
    private readonly changer: InvoiceChanger,
    private readonly invoices: InvoicesRepository,
  ) {}

  addLine(auth: RequestAuth, target: InvoiceTarget, body: AdjustmentRequestDto) {
    return this.changer.changeDraft(auth, target, async (tx, record) => {
      const position = await InvoiceDraftWriter.nextPosition(tx, record.invoice.id);
      const description = body.description.trim();
      await this.invoices.insertLine(tx, record.invoice, {
        position,
        description,
        amount: body.amount,
      });
      const totals = await InvoiceDraftWriter.recalculate(tx, record.invoice);
      await this.changer.apply(tx, auth, record.invoice, {
        action: 'admin.invoice_changed',
        changes: totals,
        version: target.version,
        after: { line_added: description, amount: body.amount, total: totals.total },
      });
    });
  }

  removeLine(auth: RequestAuth, target: InvoiceTarget, lineId: string): Promise<InvoiceDto> {
    return this.changer.changeDraft(auth, target, async (tx, record) => {
      const line = record.lines.find((candidate) => candidate.id === lineId);
      if (!line || !(await this.invoices.deleteLine(tx, record.invoice.id, lineId))) {
        throw InvoiceErrors.lineNotFound();
      }
      const totals = await InvoiceDraftWriter.recalculate(tx, record.invoice);
      await this.changer.apply(tx, auth, record.invoice, {
        action: 'admin.invoice_changed',
        changes: totals,
        version: target.version,
        after: { line_removed: line.description, amount: line.amount, total: totals.total },
      });
    });
  }

  /** The fee lines again from today's plan, size, prices and tax rate; adjustments stay. */
  regenerate(auth: RequestAuth, target: InvoiceTarget): Promise<InvoiceDto> {
    return this.changer.changeDraft(auth, target, async (tx, { invoice }) => {
      const period = BillingPeriod.parse(invoice.periodStart.slice(0, 7)) as BillingPeriod;
      const prepared = await InvoiceDrafter.prepare(tx, invoice.tenantId, period, (key) =>
        InvoiceDraftService.moduleName(key),
      );
      if (!prepared) {
        throw InvoiceErrors.planMissing();
      }
      const { taxRateBps, billingName, billingEmail, billingReference } =
        prepared.subscription.terms;
      const totals = await InvoiceDraftWriter.replaceFeeLines(
        tx,
        { id: invoice.id, tenantId: invoice.tenantId, taxRateBps },
        prepared.draft,
      );
      await this.changer.apply(tx, auth, invoice, {
        action: 'admin.invoice_changed',
        changes: { ...totals, taxRateBps, billingName, billingEmail, billingReference },
        version: target.version,
        after: { regenerated: true, total: totals.total },
      });
    });
  }

  /** Add-on lines carry the module's name as the portal shows it. */
  static moduleName(key: string): string {
    return ModuleCatalog.find(key)?.name ?? key;
  }
}
