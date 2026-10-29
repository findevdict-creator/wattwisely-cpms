import { Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  RefresherCustomEvent,
} from '@ionic/angular';
import { ChargeChips, DriverPlace } from '@wattwisely/driver-core';
import { CannotStarts } from '../../core/charging/cannot-start';
import { ChargeStarter } from '../../core/charging/charge-starter';
import { PlugWords } from '../../core/charging/plug-words';
import { NoticeCardComponent } from '../../shared/notice-card.component';
import { TopBarComponent } from '../../shared/top-bar.component';
import { PlugStore } from './plug.store';
import { PriceCardComponent } from './price-card.component';

/**
 * The plug a QR code named (Figma 9, "Plug details"): where it is, whether it is free, what it
 * costs, and what the driver is to the operator. Start goes through consent at a new operator
 * and the card for a paid charge; a free charge starts at once.
 */
@Component({
  selector: 'ww-plug',
  imports: [
    IonButton,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    MatIconModule,
    NoticeCardComponent,
    PriceCardComponent,
    RouterLink,
    TopBarComponent,
  ],
  providers: [PlugStore, ChargeStarter],
  templateUrl: './plug.component.html',
  styleUrl: './plug.component.scss',
})
export class PlugComponent {
  readonly identity = input.required<string>();
  readonly connector = input.required<string>();

  protected readonly store = inject(PlugStore);
  protected readonly starter = inject(ChargeStarter);
  private readonly router = inject(Router);

  protected readonly operator = computed(() => {
    const place = this.store.place();
    return place ? PlugStore.operator(place) : '';
  });
  protected readonly line = computed(() => this.words((place) => PlugWords.line(place)));
  protected readonly availability = computed(() =>
    ChargeChips.availability(this.store.place()?.availability ?? 'offline'),
  );
  protected readonly cannotStart = computed(() => this.words((place) => CannotStarts.of(place)));
  protected readonly accessTitle = computed(() =>
    this.words((place) => PlugWords.accessTitle(place, this.operator())),
  );
  /** Where "Add a card" comes back to once the card is saved. */
  protected readonly here = computed(() => `/plug/${this.identity()}/${this.connector()}`);
  protected readonly accessText = computed(() =>
    this.words((place) => PlugWords.accessText(place)),
  );

  ionViewWillEnter(): void {
    void this.store.load(this.identity(), this.connector());
  }

  protected async refresh(event: RefresherCustomEvent): Promise<void> {
    await this.store.load(this.identity(), this.connector());
    await event.target.complete();
  }

  protected async start(): Promise<void> {
    const place = this.store.place();
    if (!place) {
      return;
    }
    const next = ChargeStarter.next(place, false);
    if (next === 'start') {
      await this.starter.start(place, false);
      return;
    }
    await this.router.navigate(['/plug', this.identity(), this.connector(), next]);
  }

  protected mailto(email: string): string {
    return `mailto:${email}?subject=${encodeURIComponent('Invitation to charge')}`;
  }

  private words<T>(write: (place: DriverPlace) => T): T | null {
    const place = this.store.place();
    return place ? write(place) : null;
  }
}
