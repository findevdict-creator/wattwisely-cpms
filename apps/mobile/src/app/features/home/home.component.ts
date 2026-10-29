import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonRefresher,
  IonRefresherContent,
  RefresherCustomEvent,
} from '@ionic/angular';
import { AccountStore } from '../../core/account/account.store';
import { Greeting } from '../../shared/greeting';

/**
 * Home (Figma 9, "Home"): the greeting, the way to scan a plug, and the operators the driver
 * belongs to. Charging now and Nearby join it with the charging and nearby modules.
 */
@Component({
  selector: 'ww-home',
  imports: [IonContent, IonRefresher, IonRefresherContent, MatIconModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  protected readonly store = inject(AccountStore);

  protected readonly greeting = computed(() =>
    Greeting.of(this.store.me()?.display_name ?? '', new Date()),
  );

  /** Ionic calls this each time the tab comes into view, so the page is never stale. */
  ionViewWillEnter(): void {
    void this.store.load();
  }

  protected async refresh(event: RefresherCustomEvent): Promise<void> {
    await this.store.load();
    await event.target.complete();
  }
}
