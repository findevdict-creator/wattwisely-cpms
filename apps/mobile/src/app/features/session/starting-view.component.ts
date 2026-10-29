import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { IonButton, IonSpinner } from '@ionic/angular';
import { DriverChargeDetail } from '@wattwisely/driver-core';
import { StartingSteps } from '../../core/charging/starting-steps';

/**
 * "Starting your charge" (Figma 10, "Starting"): the hold, the charger, the car, each ticked
 * as it happens. The charge cannot be called off from here, so the way out is Home; the API
 * releases the hold by itself if the charger never answers.
 */
@Component({
  selector: 'ww-starting-view',
  imports: [IonButton, IonSpinner, MatIconModule, RouterLink],
  template: `
    <section class="ww-card steps" data-testid="steps">
      @for (step of steps(); track step.label) {
        <div class="step" [class]="step.state">
          @switch (step.state) {
            @case ('done') {
              <mat-icon svgIcon="circle-check" />
            }
            @case ('now') {
              <ion-spinner name="crescent" />
            }
            @default {
              <span class="dot"></span>
            }
          }
          {{ step.label }}
        </div>
      }
    </section>
    <p class="info">
      <mat-icon svgIcon="info" />
      If the charger does not answer within 90 seconds, the hold is released straight away and
      nothing is charged.
    </p>
    <ion-button class="ww-large" expand="block" fill="outline" routerLink="/tabs/home"
      >Back to Home</ion-button
    >
  `,
  styleUrl: './session-views.scss',
})
export class StartingViewComponent {
  readonly charge = input.required<DriverChargeDetail>();

  protected readonly steps = computed(() => StartingSteps.of(this.charge()));
}
