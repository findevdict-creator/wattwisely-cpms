import { Component, computed, input } from '@angular/core';
import { StatusLabels } from './status-labels';

/** A coloured dot and a word for a site, charger or connector status. */
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
  readonly kind = input<'site' | 'charger' | 'connector' | 'command'>('charger');

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
      default:
        return StatusLabels.charger(status);
    }
  }
}
