import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { NearbyPlace, NearbyStore, NearbyWords } from '@wattwisely/driver-core';

/**
 * "Nearby" on Home for a logged-in driver (module 37), as the mobile app has it: "Use my
 * location", then up to 20 sites within 15 km at every operator, nearest first, each with its
 * operator, distance, lowest price and free plugs. A site opens its free plug's page.
 */
@Component({
  selector: 'ww-nearby',
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule, RouterLink],
  templateUrl: './nearby.component.html',
  styleUrl: './nearby.component.scss',
})
export class NearbyComponent implements OnInit {
  protected readonly store = inject(NearbyStore);
  protected readonly words = NearbyWords;

  ngOnInit(): void {
    void this.store.load();
  }

  protected use(): void {
    void this.store.load(true);
  }

  /** The plug a site opens: a free one when there is one; none for a site with no plug. */
  protected plugRoute(place: NearbyPlace): string[] | null {
    return place.plug
      ? ['/c', place.plug.charger_identity, String(place.plug.ocpp_connector_id)]
      : null;
  }
}
