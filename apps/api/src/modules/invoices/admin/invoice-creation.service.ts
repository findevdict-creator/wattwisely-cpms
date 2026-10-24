import { Injectable } from '@nestjs/common';
import { BillingPeriod, InvoiceDrafter, PreparedInvoice } from '@wattwisely/billing';
import { Transaction } from '@wattwisely/db';
import { AuditRecorder } from '../../../common/audit/audit.recorder';
import { PlatformTransaction } from '../../../common/platform/platform-transaction';
import { RequestAuth } from '../../../common/request/request-auth';
import { AdminTenantDescriber } from '../../admin/tenants/admin-tenant.describer';
import { CreateInvoiceRequestDto } from '../dto/create-invoice-request.dto';
import { InvoiceDto } from '../dto/invoice.dto';
import { InvoiceErrors } from '../invoice-errors';
import { InvoiceWithLines } from '../invoice-record';
import { InvoicesRepository } from '../invoices.repository';
import { InvoiceDraftService } from './invoice-draft.service';

/**
 * Drafting an invoice by hand (module 15): for a past month the worker skipped (nothing to
 * bill then, or the plan came later) or whose invoice was voided. Same calculation as the
 * worker's, from today's plan, size and prices.
 */
@Injectable()
export class InvoiceCreationService {
  constructor(
    private readonly platform: PlatformTransaction,
    private readonly invoices: InvoicesRepository,
    private readonly tenants: AdminTenantDescriber,
    private readonly audit: AuditRecorder,
  ) {}

  create(auth: RequestAuth, tenantId: string, body: CreateInvoiceRequestDto): Promise<InvoiceDto> {
    const period = BillingPeriod.parse(body.month);
    if (!period) {
      throw InvoiceErrors.badMonth();
    }
    if (!period.hasEnded(new Date())) {
      throw InvoiceErrors.monthNotOver();
    }
    return this.platform.runInTenant(auth, tenantId, async (tx) => {
      const { tenant } = await this.tenants.requireLive(tx, tenantId);
      if (await this.invoices.findForMonth(tx, tenantId, period.firstDay)) {
        throw InvoiceErrors.exists(period.key);
      }
      const prepared = await InvoiceCreationService.prepare(tx, tenantId, period);
      const createdBy = auth.requireAccount().id;
      const id = await InvoiceDrafter.create(tx, { tenantId, period, createdBy }, prepared);
      await this.record(tx, auth, { id, tenantId, slug: tenant.slug }, prepared);
      return new InvoiceDto((await this.invoices.findById(tx, id)) as InvoiceWithLines);
    });
  }

  /** The lines for the month, or 409 when the tenant has no plan (or a cancelled one). */
  private static async prepare(tx: Transaction, tenantId: string, period: BillingPeriod) {
    const prepared = await InvoiceDrafter.prepare(tx, tenantId, period, (key) =>
      InvoiceDraftService.moduleName(key),
    );
    if (!prepared) {
      throw InvoiceErrors.planMissing();
    }
    return prepared;
  }

  private record(
    tx: Transaction,
    auth: RequestAuth,
    target: { id: string; tenantId: string; slug: string },
    prepared: PreparedInvoice,
  ) {
    return this.audit.record(
      tx,
      auth,
      {
        action: 'admin.invoice_drafted',
        targetType: 'invoice',
        targetId: target.id,
        targetLabel: prepared.input.period.key,
        after: { tenant: target.slug, lines: prepared.draft.lines.length },
      },
      target.tenantId,
    );
  }
}
