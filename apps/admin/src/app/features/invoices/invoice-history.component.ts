import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { Invoice } from '../../core/api/models/invoice';

/** One step in an invoice's life, newest first in the card. */
interface InvoiceStep {
  tone: 'done' | 'sent' | 'quiet' | 'void';
  text: string;
  at: string;
}

/** The "History" card of an invoice: drafted, issued, paid or voided, with the dates. */
@Component({
  selector: 'ww-invoice-history',
  imports: [DatePipe],
  template: `
    <section class="ww-card" aria-labelledby="history-title">
      <div class="ww-card-head">
        <div class="titles"><h2 id="history-title">History</h2></div>
      </div>
      <div class="ww-card-body">
        @for (step of steps(); track step.text) {
          <div class="ww-list-item">
            <span class="dot {{ step.tone }}"></span>
            <span class="ww-grow">{{ step.text }}</span>
            <span class="when">{{ step.at | date: 'd MMM y' }}</span>
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .ww-card-body {
      gap: 0;
      padding-top: 4px;
    }
    .ww-list-item {
      font-size: 13px;
    }
    .dot {
      flex: none;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--mat-sys-outline);
    }
    .done {
      background: var(--mat-sys-primary);
    }
    .sent {
      background: var(--ww-info-text);
    }
    .void {
      background: var(--ww-danger-text);
    }
    .when {
      font-size: 12px;
      color: var(--mat-sys-outline);
    }
  `,
})
export class InvoiceHistoryComponent {
  readonly invoice = input.required<Invoice>();

  protected readonly steps = computed(() => {
    const invoice = this.invoice();
    const steps: (InvoiceStep | null)[] = [
      invoice.voided_at ? { tone: 'void', text: 'Voided', at: invoice.voided_at } : null,
      invoice.paid_at ? { tone: 'done', text: this.paidText(invoice), at: invoice.paid_at } : null,
      invoice.issued_at
        ? { tone: 'sent', text: this.issuedText(invoice), at: invoice.issued_at }
        : null,
      { tone: 'quiet', text: 'Drafted', at: invoice.created_at },
    ];
    return steps.filter((step): step is InvoiceStep => step !== null);
  });

  private paidText(invoice: Invoice): string {
    return invoice.payment_reference ? `Paid, ${invoice.payment_reference}` : 'Paid';
  }

  private issuedText(invoice: Invoice): string {
    const due = invoice.due_at
      ? new Date(invoice.due_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      : '';
    return due ? `Issued and e-mailed, due ${due}` : 'Issued and e-mailed';
  }
}
