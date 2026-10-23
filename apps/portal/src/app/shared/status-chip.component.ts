import { Component, computed, input } from '@angular/core';
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
  | 'proposal';

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

  private static labelOf(kind: string, status: string): string {
    switch (kind) {
      case 'site':
        return StatusLabels.site(status);
      case 'connector':
        return StatusLabels.connector(status);
      case 'command':
        return StatusLabels.command(status);
      case 'session':
        return StatusLabels.session(status);
      case 'payment':
        return StatusLabels.payment(status);
      case 'refund':
        return StatusLabels.refund(status);
      case 'payment_account':
        return StatusLabels.paymentAccount(status);
      case 'managed_service':
        return StatusLabels.managedService(status);
      case 'proposal':
        return StatusLabels.proposal(status);
      default:
        return StatusLabels.charger(status);
    }
  }
}
