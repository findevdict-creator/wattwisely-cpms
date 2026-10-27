import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Site } from '../../core/api/models/site';
import { SiteMapLayout } from './site-map-layout';

/**
 * Sites as pins where they are, each linking to its site: green with a connector free, amber
 * when all are in use, red with a problem, grey when offline. No map tiles, so no page view
 * reaches a map provider; the dotted background stands in for streets.
 */
@Component({
  selector: 'ww-site-map',
  imports: [RouterLink],
  template: `
    <div
      class="map"
      [class.single]="pins().length === 1"
      [style.height.px]="height()"
      data-testid="fleet"
    >
      @for (pin of pins(); track pin.site.id) {
        <a
          class="pin {{ pin.tone }}"
          [class.flipped]="pin.isFlipped"
          [class.on]="pin.site.id === selectedId()"
          [routerLink]="['/sites', pin.site.id]"
          [style.left.%]="pin.isFlipped ? null : pin.left"
          [style.right.%]="pin.isFlipped ? 100 - pin.left : null"
          [style.top.%]="pin.top"
          >{{ pin.label }}</a
        >
      }
      @if (hasLegend()) {
        <div class="legend" aria-hidden="true">
          <span><i class="ok"></i>Available</span>
          <span><i class="busy"></i>All in use</span>
          <span><i class="bad"></i>Problem</span>
          <span><i class="off"></i>Offline</span>
        </div>
      }
    </div>
  `,
  styleUrl: './site-map.component.scss',
})
export class SiteMapComponent {
  readonly sites = input.required<Site[]>();
  readonly height = input(250);
  readonly hasLegend = input(false);
  readonly selectedId = input<string | null>(null);

  protected readonly pins = computed(() => SiteMapLayout.place(this.sites()));
}
