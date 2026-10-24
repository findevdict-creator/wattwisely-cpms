import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { AdminInvoicesController } from './admin/admin-invoices.controller';
import { AdminInvoicesService } from './admin/admin-invoices.service';
import { AdminTenantInvoicesController } from './admin/admin-tenant-invoices.controller';
import { InvoiceChanger } from './admin/invoice.changer';
import { InvoiceCreationService } from './admin/invoice-creation.service';
import { InvoiceDraftService } from './admin/invoice-draft.service';
import { InvoiceLifecycleService } from './admin/invoice-lifecycle.service';
import { InvoiceWriter } from './admin/invoice.writer';
import { InvoiceDescriber } from './invoice.describer';
import { InvoicesRepository } from './invoices.repository';
import { InvoiceMailer } from './mail/invoice.mailer';
import { InvoicesController } from './tenant/invoices.controller';
import { InvoicesService } from './tenant/invoices.service';

/**
 * Invoicing (module 15): Wattwisely's monthly invoices to tenants for the plan, add-ons, the
 * managed service and the revenue share. Staff draft, check, issue, settle and void them in
 * the admin console; a tenant reads its own under Settings, Invoices. The worker drafts them.
 */
@Module({
  imports: [SubscriptionModule, AdminModule],
  controllers: [InvoicesController, AdminInvoicesController, AdminTenantInvoicesController],
  providers: [
    InvoicesRepository,
    InvoiceDescriber,
    InvoiceWriter,
    InvoiceChanger,
    InvoiceMailer,
    InvoiceLifecycleService,
    InvoiceDraftService,
    InvoiceCreationService,
    AdminInvoicesService,
    InvoicesService,
  ],
})
export class InvoicesModule {}
