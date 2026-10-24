import { Component, computed, input } from '@angular/core';
import { DriverStatusLabels } from './driver-status-labels';
import { IntegrationStatusLabels } from './integration-status-labels';
import { InvoiceStatusLabels } from './invoice-status-labels';
import { StatusLabels } from './status-labels';

/** Which table of words a status comes from. */
export type StatusKind =
  | 'site'
  | 'charger'
  | 'connector'
  | 'command'
  | 'session'
  | 'payment'
  | 'refund'
  | 'payment_account'
  | 'managed_service'
  | 'proposal'
  | 'invoice'
  | 'driver'
  | 'card'
  | 'api_key'
  | 'webhook'
  | 'delivery';

/** A coloured dot and a word for a site, charger, connector, command, session, payment or refund status. */
@Component({
  selector: 'ww-status-chip',
  template: `<span class="chip {{ tone() }}" [attr.data-status]="status()"
    ><span class="dot"></span>{{ label() }}</span
  >`,
  styles: `
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--mat-sys-outline);
    }
    .good .dot {
      background: #2e7d32;
    }
    .busy .dot {
      background: #1565c0;
    }
    .bad .dot {
      background: var(--mat-sys-error);
    }
  `,
})
export class StatusChipComponent {
  readonly status = input.required<string>();
  readonly kind = input<StatusKind>('charger');

  protected readonly tone = computed(() => StatusLabels.toneOf(this.status()));
  protected readonly label = computed(() =>
    StatusChipComponent.labelOf(this.kind(), this.status()),
  );

  /** The table of words for each kind; chargers for a kind nobody named. */
  private static readonly WORDS: Record<StatusKind, (status: string) => string> = {
    site: StatusLabels.site,
    charger: StatusLabels.charger,
    connector: StatusLabels.connector,
    command: StatusLabels.command,
    session: StatusLabels.session,
    payment: StatusLabels.payment,
    refund: StatusLabels.refund,
    payment_account: StatusLabels.paymentAccount,
    managed_service: StatusLabels.managedService,
    proposal: StatusLabels.proposal,
    invoice: InvoiceStatusLabels.invoice,
    driver: DriverStatusLabels.driver,
    card: DriverStatusLabels.card,
    api_key: IntegrationStatusLabels.apiKey,
    webhook: IntegrationStatusLabels.webhook,
    delivery: IntegrationStatusLabels.delivery,
  };

  private static labelOf(kind: StatusKind, status: string): string {
    return (StatusChipComponent.WORDS[kind] ?? StatusLabels.charger)(status);
  }
}
