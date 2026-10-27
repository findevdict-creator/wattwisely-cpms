import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '@wattwisely/ui';
import { Site } from '../../core/api/models/site';
import { FleetLayout } from './fleet-layout';

/** Live fleet: every site as a pin where it is, green when all is well, red or grey when not. */
@Component({
  selector: 'ww-fleet-card',
  imports: [EmptyStateComponent, RouterLink],
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
        @if (pins().length > 0) {
          <div class="map" data-testid="fleet">
            @for (pin of pins(); track pin.site.id) {
              <a
                class="pin {{ pin.tone }}"
                [class.flipped]="pin.isFlipped"
                [routerLink]="['/sites', pin.site.id]"
                [style.left.%]="pin.isFlipped ? null : pin.left"
                [style.right.%]="pin.isFlipped ? 100 - pin.left : null"
                [style.top.%]="pin.top"
                >{{ pin.label }}</a
              >
            }
          </div>
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
    .map {
      position: relative;
      height: 250px;
      overflow: hidden;
      border-radius: var(--ww-radius-md);
      background:
        radial-gradient(circle, var(--mat-sys-outline-variant) 1px, transparent 1.5px) 0 0 / 20px
          20px,
        var(--mat-sys-surface-variant);
    }
    .pin {
      position: absolute;
      display: inline-flex;
      gap: 6px;
      align-items: center;
      max-width: 48%;
      padding: 4px 10px 4px 6px;
      border-radius: 999px;
      font-size: 12px;
      line-height: 16px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-decoration: none;
      color: var(--mat-sys-on-surface);
      background: var(--mat-sys-surface);
      box-shadow: 0 8px 24px -4px color-mix(in srgb, var(--ww-ink) 12%, transparent);
    }
    .pin::before {
      content: '';
      flex: none;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--ww-brand);
    }
    .pin.flipped {
      flex-direction: row-reverse;
      padding: 4px 6px 4px 10px;
    }
    .pin.bad::before {
      background: var(--ww-danger);
    }
    .pin.off::before {
      background: var(--ww-muted);
    }
  `,
})
export class FleetCardComponent {
  readonly sites = input.required<Site[]>();
  readonly chargingNow = input<number | null>(null);

  protected readonly pins = computed(() => FleetLayout.place(this.sites()));
}
