import { Injectable, Logger } from '@nestjs/common';
import { MinorUnits } from '@wattwisely/billing';
import { BrandedMailLayout, TenantBrand } from '@wattwisely/mail';
import { ApiConfig } from '../../../config/api.config';
import { MailSender } from '../../../common/mail/mail.sender';
import { InvoiceDto } from '../dto/invoice.dto';

/**
 * The e-mail that goes to a tenant's billing contact when an invoice is issued (module 15).
 * From Wattwisely in its own colours, not the tenant's: it is Wattwisely's invoice.
 */
@Injectable()
export class InvoiceMailer {
  private readonly logger = new Logger(InvoiceMailer.name);

  constructor(
    private readonly config: ApiConfig,
    private readonly mailSender: MailSender,
  ) {}

  /** True when an e-mail went out; false when the tenant has no billing address or sending failed. */
  async issued(invoice: InvoiceDto): Promise<boolean> {
    if (!invoice.billing_email) {
      return false;
    }
    const total = MinorUnits.text(invoice.total, invoice.currency);
    const due = invoice.due_at?.slice(0, 10) ?? '';
    const message = BrandedMailLayout.render(TenantBrand.defaults(TenantBrand.PLATFORM_NAME), {
      subject: `Invoice ${invoice.number} from Wattwisely: ${total}, due by ${due}`,
      headline: `Your Wattwisely invoice for ${invoice.month_label}`,
      paragraphs: [
        `Invoice ${invoice.number} for ${invoice.tenant_name} comes to ${total}${InvoiceMailer.taxNote(invoice)}. It is due by ${due}.`,
        'The invoice with every line is in the portal under Settings, Invoices. Reply to this e-mail with any question about it.',
      ],
      action: { label: 'Open the invoice', url: this.link(invoice.id) },
      footnote: invoice.billing_reference
        ? `Your reference: ${invoice.billing_reference}`
        : undefined,
    });
    try {
      await this.mailSender.send({ to: invoice.billing_email, ...message });
      return true;
    } catch (error) {
      this.logger.error(
        `Invoice e-mail to ${invoice.billing_email} failed: ${(error as Error).message}`,
      );
      return false;
    }
  }

  private static taxNote(invoice: InvoiceDto): string {
    if (invoice.tax_amount === 0) {
      return '';
    }
    const tax = MinorUnits.text(invoice.tax_amount, invoice.currency);
    return ` (including ${MinorUnits.percent(invoice.tax_rate_bps)} tax, ${tax})`;
  }

  private link(invoiceId: string): string {
    return `${this.config.portalUrl.replace(/\/$/, '')}/settings/invoices/${invoiceId}`;
  }
}
