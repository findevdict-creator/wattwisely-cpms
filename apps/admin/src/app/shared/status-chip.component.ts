import { Component, computed, input } from '@angular/core';

/** A coloured dot and a word for a tenant, subscription, staff or module state. */
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
    .warn .dot {
      background: #ef6c00;
    }
    .bad .dot {
      background: var(--mat-sys-error);
    }
  `,
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
  };
  static readonly TONES: Record<string, string> = {
    active: 'good',
    trial: 'busy',
    trialing: 'busy',
    invited: 'busy',
    past_due: 'warn',
    suspended: 'bad',
    cancelled: 'neutral',
  };

  readonly status = input.required<string | null>();

  protected readonly label = computed(
    () => StatusChipComponent.LABELS[this.status() ?? 'none'] ?? this.status(),
  );
  protected readonly tone = computed(
    () => StatusChipComponent.TONES[this.status() ?? ''] ?? 'neutral',
  );
}
