import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonRefresher,
  IonRefresherContent,
  RefresherCustomEvent,
} from '@ionic/angular';
import { DurationPipe, Money } from '@wattwisely/driver-core';
import { AccountStore } from '../../core/account/account.store';
import { ChargingNowStore } from '../../core/charging/charging-now.store';
import { Greeting } from '../../shared/greeting';

/**
 * Home (Figma 9, "Home"): the greeting, the way to scan a plug, the charge under way when
 * there is one, and the operators the driver belongs to. Nearby joins it with module 35.
 */
@Component({
  selector: 'ww-home',
  imports: [DurationPipe, IonContent, IonRefresher, IonRefresherContent, MatIconModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  protected readonly store = inject(AccountStore);
  protected readonly chargingNow = inject(ChargingNowStore);
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
  }

  protected async refresh(event: RefresherCustomEvent): Promise<void> {
    this.now.set(Date.now());
    await Promise.all([this.store.load(), this.chargingNow.load()]);
    await event.target.complete();
  }
}
