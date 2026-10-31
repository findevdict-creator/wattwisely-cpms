import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  RefresherCustomEvent,
} from '@ionic/angular';
import { DurationPipe, Money, NearbyPlace } from '@wattwisely/driver-core';
import { AccountStore } from '../../core/account/account.store';
import { ChargingNowStore } from '../../core/charging/charging-now.store';
import { NearbyStore } from '../../core/nearby/nearby.store';
import { NearbyWords } from '../../core/nearby/nearby-words';
import { Greeting } from '../../shared/greeting';

/**
 * Home (Figma 9, "Home"): the greeting, the way to scan a plug, the charge under way when
 * there is one, the operators the driver belongs to, and the sites nearby (module 35).
 */
@Component({
  selector: 'ww-home',
  imports: [
    DurationPipe,
    IonButton,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    MatIconModule,
    RouterLink,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  protected readonly store = inject(AccountStore);
  protected readonly chargingNow = inject(ChargingNowStore);
  protected readonly nearby = inject(NearbyStore);
  protected readonly words = NearbyWords;
  protected readonly now = signal(Date.now());

  /** "12.4 kWh · €5.58". */
  protected readonly chargeLine = computed(() => {
    const charge = this.chargingNow.charge();
    if (!charge) {
      return '';
    }
    const energy = `${(charge.energy_wh / 1000).toFixed(1)} kWh`;
    return charge.amount === null
      ? energy
      : `${energy} · ${Money.format(charge.amount, charge.currency)}`;
  });

  protected readonly greeting = computed(() =>
    Greeting.of(this.store.me()?.display_name ?? '', new Date()),
  );

  /** Ionic calls this each time the tab comes into view, so the page is never stale. */
  ionViewWillEnter(): void {
    this.now.set(Date.now());
    void this.store.load();
    void this.chargingNow.load();
    void this.nearby.load();
  }

  /** A site opens its free plug's page, or the first plug's when none is free. */
  protected plugRoute(place: NearbyPlace): string[] | null {
    return place.plug
      ? ['/plug', place.plug.charger_identity, String(place.plug.ocpp_connector_id)]
      : null;
  }

  protected async refresh(event: RefresherCustomEvent): Promise<void> {
    this.now.set(Date.now());
    await Promise.all([this.store.load(), this.chargingNow.load(), this.nearby.load()]);
    await event.target.complete();
  }
}
