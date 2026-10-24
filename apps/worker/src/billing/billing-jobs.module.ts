import { Module } from '@nestjs/common';
import { BillingRepository } from './billing.repository';
import { InvoiceDraftJob } from './invoice-draft.job';
import { InvoiceOverdueJob } from './invoice-overdue.job';

/** The billing jobs (module 15): last month's invoice drafts, and subscriptions past due. */
@Module({
  providers: [BillingRepository, InvoiceDraftJob, InvoiceOverdueJob],
})
export class BillingJobsModule {}
