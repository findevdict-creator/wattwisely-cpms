import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '@wattwisely/ui';
import { Site } from '../../core/api/models/site';
import { SiteMapComponent } from '../../shared/site-map/site-map.component';

/** Live fleet: every site as a pin where it is, green when all is well, red or grey when not. */
@Component({
  selector: 'ww-fleet-card',
  imports: [EmptyStateComponent, RouterLink, SiteMapComponent],
  template: `
    <section class="ww-card" aria-labelledby="fleet-title">
      <div class="ww-card-head">
        <div class="titles">
          <h2 id="fleet-title">Live fleet</h2>
          <p>
            Updates every minute.
            @if (chargingNow() !== null) {
              {{ chargingNow() }} charging now
            }
          </p>
        </div>
        <span class="ww-chip live">Live</span>
      </div>
      <div class="ww-card-body">
        @if (sites().length > 0) {
          <ww-site-map [sites]="sites()" />
        } @else {
          <ww-empty-state icon="map-pin" heading="No sites yet" text="Add a site to see it here.">
            <a routerLink="/sites">Go to Sites</a>
          </ww-empty-state>
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
      box-sizing: border-box;
    }
  `,
})
export class FleetCardComponent {
  readonly sites = input.required<Site[]>();
  readonly chargingNow = input<number | null>(null);
}
