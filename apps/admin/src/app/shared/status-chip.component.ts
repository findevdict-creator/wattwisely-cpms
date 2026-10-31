import { Component, computed, input } from '@angular/core';

/** A tenant, subscription, staff or invoice state as a soft pill in the shared chip style. */
@Component({
  selector: 'ww-status-chip',
  template: `<span class="ww-chip {{ tone() }}" [attr.data-status]="status()">{{ label() }}</span>`,
})
export class StatusChipComponent {
  static readonly LABELS: Record<string, string> = {
    trial: 'Trial',
    trialing: 'Trialing',
    active: 'Active',
    past_due: 'Past due',
    suspended: 'Suspended',
    cancelled: 'Cancelled',
    invited: 'Invited',
    none: 'No plan',
    pending_acceptance: 'Offered',
    ending: 'Ending',
    ended: 'Ended',
    withdrawn: 'Withdrawn',
    draft: 'Draft',
    issued: 'Issued',
    overdue: 'Overdue',
    paid: 'Paid',
    void: 'Void',
  };
  static readonly TONES: Record<string, string> = {
    active: 'ok',
    trial: 'info',
    trialing: 'info',
    invited: 'info',
    pending_acceptance: 'info',
    ending: 'warn',
    past_due: 'warn',
    suspended: 'danger',
    cancelled: 'neutral',
    issued: 'info',
    overdue: 'warn',
    paid: 'ok',
  };

  readonly status = input.required<string | null>();

  protected readonly label = computed(
    () => StatusChipComponent.LABELS[this.status() ?? 'none'] ?? this.status(),
  );
  protected readonly tone = computed(
    () => StatusChipComponent.TONES[this.status() ?? ''] ?? 'neutral',
  );
}
