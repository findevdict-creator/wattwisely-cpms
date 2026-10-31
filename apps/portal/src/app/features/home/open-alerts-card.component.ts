import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '@wattwisely/ui';
import { Alert, AlertTypeLabels } from '../../core/api/models/alert';
import { DayLabel } from '../../shared/day-label';
import { AlertSeverity } from '../alerts/alert-severity';

/** The newest open alerts, each a link to its page, and how many there are in all. */
@Component({
  selector: 'ww-open-alerts-card',
  imports: [EmptyStateComponent, MatButtonModule, RouterLink],
  template: `
    <section class="ww-card" aria-labelledby="open-alerts-title">
      <div class="ww-card-head">
        <div class="titles">
          <h2 id="open-alerts-title">Open alerts</h2>
          <p>
            <span data-testid="tile-alerts">{{ count() }}</span>
            {{ count() === 1 ? 'needs' : 'need' }} attention
          </p>
        </div>
        <a mat-button class="ww-small" routerLink="/alerts">View all</a>
      </div>
      <div class="ww-card-body list">
        @for (alert of alerts(); track alert.id) {
          <a class="ww-list-item" [routerLink]="['/alerts', alert.id]">
            <span class="ww-two ww-grow">
              <b>{{ alert.site_name }} · {{ alert.charger_identity }}</b>
              <span>{{ labels[alert.type] }} · {{ days.dayAndTime(alert.began_at) }}</span>
            </span>
            <span class="ww-chip {{ severity.of(alert.type).tone }}">{{
              severity.of(alert.type).label
            }}</span>
          </a>
        } @empty {
          <ww-empty-state icon="circle-check" heading="Nothing needs attention right now." />
        }
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .ww-card {
      height: 100%;
    }
    .list {
      gap: 0;
      padding-top: 4px;
    }
    .ww-two b {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
})
export class OpenAlertsCardComponent {
  readonly alerts = input.required<Alert[]>();
  readonly count = input.required<number>();

  protected readonly labels = AlertTypeLabels.LABELS;
  protected readonly days = DayLabel;
  protected readonly severity = AlertSeverity;
}
