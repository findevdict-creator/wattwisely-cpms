import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionDetail } from '../../core/api/models/session';
import { StartSourceWords } from '../../shared/start-source-words';
import { StatusLabels } from '../../shared/status-labels';

/** Where a session ran and how it started and stopped, beside the session page. */
@Component({
  selector: 'ww-session-charger',
  imports: [RouterLink],
  template: `
    <section class="ww-card" aria-labelledby="charger-title">
      <div class="ww-card-head">
        <div class="titles"><h2 id="charger-title">Charger</h2></div>
      </div>
      <div class="ww-card-body">
        <dl class="ww-kv">
          <div>
            <dt>Charger</dt>
            <dd>
              <a class="mono" [routerLink]="['/chargers', session().charger_id]">{{
                session().charger_identity
              }}</a>
            </dd>
          </div>
          <div>
            <dt>Connector</dt>
            <dd>{{ session().connector_label }}</dd>
          </div>
          <div>
            <dt>Card or token</dt>
            <dd class="mono">{{ session().id_tag }}</dd>
          </div>
          @if (session().start_source; as source) {
            <div>
              <dt>Started by</dt>
              <dd data-testid="start-source">{{ startSource(source) }}</dd>
            </div>
          }
          @if (session().payment_rule; as rule) {
            <div class="wide">
              <dt>Who pays</dt>
              <dd data-testid="payment-rule">{{ rule.words }}</dd>
            </div>
          }
          <div>
            <dt>Transaction</dt>
            <dd>{{ session().ocpp_transaction_id ?? 'Not started by the charger yet' }}</dd>
          </div>
          @if (session().stop_reason; as reason) {
            <div>
              <dt>Stop reason</dt>
              <dd>{{ reason }}</dd>
            </div>
          }
          @if (session().failure_reason; as reason) {
            <div class="wide">
              <dt>Failed because</dt>
              <dd>{{ failure(reason) }}</dd>
            </div>
          }
        </dl>
      </div>
    </section>
  `,
  styles: `
    .mono {
      font-size: 13px;
    }
  `,
})
export class SessionChargerComponent {
  readonly session = input.required<SessionDetail>();

  protected readonly startSource = StartSourceWords.of;
  protected readonly failure = StatusLabels.failure;
}
