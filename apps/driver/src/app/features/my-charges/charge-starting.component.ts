import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DriverChargeDetail, StartingSteps } from '@wattwisely/driver-core';

/**
 * Starting a charge with the login (module 36): the hold (or the rule that made it free), the
 * charger answering, the car and the charge, each ticked as it happens, as in the mobile app.
 */
@Component({
  selector: 'ww-charge-starting',
  imports: [MatIconModule, MatProgressSpinnerModule],
  template: `
    <section class="panel" data-testid="phase-starting">
      <h2>Starting the charger</h2>
      <ol class="ticks" data-testid="starting-steps">
        @for (step of steps(); track step.label) {
          <li [class]="step.state">
            @switch (step.state) {
              @case ('done') {
                <mat-icon svgIcon="circle-check" />
              }
              @case ('now') {
                <mat-spinner diameter="20" />
              }
              @default {
                <span class="dot"></span>
              }
            }
            {{ step.label }}
          </li>
        }
      </ol>
      <p class="hint">
        If the charger does not answer within 90 seconds, the hold is released straight away and
        nothing is charged.
      </p>
    </section>
  `,
  styles: `
    .ticks {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin: 4px 0 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      gap: 12px;
      align-items: center;
      color: var(--mat-sys-on-surface-variant);
    }
    li.done mat-icon {
      color: var(--mat-sys-primary);
    }
    li.now {
      font-weight: 600;
      color: var(--mat-sys-on-surface);
    }
    mat-icon,
    mat-spinner {
      flex: none;
      width: 20px;
      height: 20px;
    }
    .dot {
      flex: none;
      width: 20px;
      height: 20px;
      border: 2px solid var(--mat-sys-outline-variant);
      border-radius: 50%;
      box-sizing: border-box;
    }
  `,
})
export class ChargeStartingComponent {
  readonly charge = input.required<DriverChargeDetail>();

  protected readonly steps = computed(() => StartingSteps.of(this.charge()));
}
