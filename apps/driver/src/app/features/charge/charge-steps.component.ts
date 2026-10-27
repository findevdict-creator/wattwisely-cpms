import { Component, computed, input } from '@angular/core';
import { ChargePhase } from '../../shared/charge-phase';
import { ChargeSteps } from '../../shared/charge-steps';

/** Paid, Started, Charging, Done over a charge in progress: a bar for each, filled as it passes. */
@Component({
  selector: 'ww-charge-steps',
  template: `
    <ol aria-label="Progress" data-testid="steps">
      @for (step of steps(); track step.label) {
        <li [class]="step.state" [attr.aria-current]="step.state === 'now' ? 'step' : null">
          <span class="ww-progress"><i></i></span>
          <span class="label">{{ step.label }}</span>
        </li>
      }
    </ol>
  `,
  styles: `
    ol {
      display: flex;
      gap: 6px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 6px;
    }
    i {
      width: 0;
    }
    .done i {
      width: 100%;
    }
    .now i {
      width: 50%;
    }
    .label {
      font-size: 12px;
      line-height: 16px;
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant);
    }
    .done .label {
      color: var(--mat-sys-primary);
    }
    .now .label {
      font-weight: 600;
      color: var(--mat-sys-on-surface);
    }
  `,
})
export class ChargeStepsComponent {
  readonly phase = input.required<ChargePhase | null>();

  protected readonly steps = computed(() => ChargeSteps.of(this.phase()));
}
