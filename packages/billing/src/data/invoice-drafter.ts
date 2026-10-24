import { Transaction } from '@wattwisely/db';
import { InvoiceCalculator } from '../invoice/invoice-calculator';
import { InvoiceDraft } from '../invoice/invoice-draft';
import { InvoiceInput } from '../invoice/invoice-input';
import { BillingPeriod } from '../period/billing-period';
import { DraftTarget, InvoiceDraftWriter } from './invoice-draft.writer';
import { BillableSubscription, InvoiceInputLoader, ModuleNameLookup } from './invoice-input.loader';

/** A month's invoice worked out but not yet stored. */
export interface PreparedInvoice {
  subscription: BillableSubscription;
  input: InvoiceInput;
  draft: InvoiceDraft;
}

/**
 * Drafts one tenant's invoice for one month (module 15): reads the plan, the size, the
 * add-ons, the managed service and the revenue, works the lines out and stores them. The
 * worker does it on the 1st for every tenant; staff do it from the console for any past month.
 */
export class InvoiceDrafter {
  /** Null when the tenant has no plan, or its subscription is cancelled: nothing to bill. */
  static async prepare(
    tx: Transaction,
    tenantId: string,
    period: BillingPeriod,
    nameOf: ModuleNameLookup,
  ): Promise<PreparedInvoice | null> {
    const loaded = await InvoiceInputLoader.load(tx, tenantId, period, nameOf);
    if (!loaded || loaded.subscription.terms.status === 'cancelled') {
      return null;
    }
    return { ...loaded, draft: InvoiceCalculator.calculate(loaded.input) };
  }

  /** Stores the prepared invoice as a draft and answers its id. */
  static create(tx: Transaction, target: DraftTarget, prepared: PreparedInvoice): Promise<string> {
    return InvoiceDraftWriter.insert(tx, target, prepared.input, prepared.draft);
  }

  /** True when the month would make an invoice with at least one line. */
  static hasCharges(prepared: PreparedInvoice): boolean {
    return prepared.draft.lines.length > 0;
  }
}
