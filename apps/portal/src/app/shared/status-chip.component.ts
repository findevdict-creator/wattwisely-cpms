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

/**
 * A status as a soft pill in the shared chip style (packages/ui): green when all is well, a dot
 * while charging, blue while waiting, amber when it needs a look, red when it failed.
 */
@Component({
  selector: 'ww-status-chip',
  template: `<span class="ww-chip {{ tone() }}" [attr.data-status]="status()">{{ label() }}</span>`,
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
