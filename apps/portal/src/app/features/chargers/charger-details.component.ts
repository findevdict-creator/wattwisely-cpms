import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { Charger } from '../../core/api/models/charger';

/** How a charger connects and what it reported about itself, under the Details tab. */
@Component({
  selector: 'ww-charger-details',
  imports: [DatePipe],
  template: `
    <div class="cards">
      <section class="ww-card" aria-labelledby="connection-title">
        <div class="ww-card-head">
          <div class="titles"><h2 id="connection-title">Connection</h2></div>
        </div>
        <div class="ww-card-body">
          <dl class="ww-kv">
            <div>
              <dt>Security</dt>
              <dd>
                {{
                  charger().auth_mode === 'password' ? 'Password' : 'No password (boot fingerprint)'
                }}
              </dd>
            </div>
            <div>
              <dt>Plain ws://</dt>
              <dd>{{ charger().allow_plain_ws ? 'Allowed' : 'Not allowed' }}</dd>
            </div>
            <div>
              <dt>OCPP version</dt>
              <dd>{{ charger().ocpp_version || 'Not connected yet' }}</dd>
            </div>
            <div>
              <dt>Connection</dt>
              <dd data-testid="connection">
                @if (charger().is_online) {
                  Online since {{ charger().connected_at | date: 'd MMM, HH:mm' }}
                } @else {
                  Offline
                }
              </dd>
            </div>
            <div>
              <dt>Last seen</dt>
              <dd>
                {{
                  charger().last_seen_at ? (charger().last_seen_at | date: 'd MMM, HH:mm') : 'Never'
                }}
              </dd>
            </div>
            <div>
              <dt>Visibility</dt>
              <dd>
                {{ charger().visibility === 'public' ? 'Public' : 'Private' }}
                {{ charger().visibility_override ? '(set on the charger)' : '(from the site)' }}
              </dd>
            </div>
          </dl>
        </div>
      </section>
      <section class="ww-card" aria-labelledby="reported-title">
        <div class="ww-card-head">
          <div class="titles"><h2 id="reported-title">Reported by the charger</h2></div>
        </div>
        <div class="ww-card-body">
          @if (charger().last_boot_at) {
            <dl class="ww-kv">
              <div>
                <dt>Serial</dt>
                <dd>{{ charger().charge_point_serial || charger().charge_box_serial || '—' }}</dd>
              </div>
              <div>
                <dt>Firmware</dt>
                <dd>{{ charger().firmware_version || '—' }}</dd>
              </div>
              <div>
                <dt>Last boot</dt>
                <dd>{{ charger().last_boot_at | date: 'd MMM y, HH:mm' }}</dd>
              </div>
              <div>
                <dt>Registration</dt>
                <dd>{{ charger().registration_status || '—' }}</dd>
              </div>
            </dl>
          } @else {
            <p class="hint">
              Nothing yet. Once the charger connects, what it reports appears here.
            </p>
          }
        </div>
      </section>
    </div>
  `,
  styles: `
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 16px;
    }
    .hint {
      margin: 0;
    }
  `,
})
export class ChargerDetailsComponent {
  readonly charger = input.required<Charger>();
}
