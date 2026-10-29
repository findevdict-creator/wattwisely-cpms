import { Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { IonButton, IonContent, IonRadio, IonRadioGroup, IonSpinner } from '@ionic/angular';
import { ChargeStarter } from '../../core/charging/charge-starter';
import { PlugWords } from '../../core/charging/plug-words';
import { PriceRows } from '../../core/charging/price-rows';
import { TopBarComponent } from '../../shared/top-bar.component';
import { CardChoiceStore } from './card-choice.store';
import { PlugStore } from './plug.store';

/**
 * The card for a paid charge (Figma 10, "Start charging"): the plug in short, the saved cards,
 * the hold and what becomes of it, and the start. `consent` is set when the driver has just
 * agreed to a new operator's terms on the page before.
 */
@Component({
  selector: 'ww-card',
  imports: [
    IonButton,
    IonContent,
    IonRadio,
    IonRadioGroup,
    IonSpinner,
    MatIconModule,
    TopBarComponent,
  ],
  providers: [PlugStore, CardChoiceStore, ChargeStarter],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
})
export class CardComponent {
  readonly identity = input.required<string>();
  readonly connector = input.required<string>();
  readonly consent = input<string>();

  protected readonly store = inject(PlugStore);
  protected readonly cards = inject(CardChoiceStore);
  protected readonly starter = inject(ChargeStarter);

  protected readonly expiry = CardChoiceStore.expiry;
  protected readonly cardName = PlugWords.card;
  protected readonly operator = computed(() => {
    const place = this.store.place();
    return place ? PlugStore.operator(place) : '';
  });
  protected readonly hold = computed(() => {
    const place = this.store.place();
    return place ? PlugWords.hold(place) : null;
  });
  protected readonly startLabel = computed(() => {
    const place = this.store.place();
    return place ? PlugWords.startLabel(place) : '';
  });
  protected readonly estimate = computed(() => {
    const tariff = this.store.place()?.tariff;
    return tariff ? PriceRows.estimate(tariff) : null;
  });

  ionViewWillEnter(): void {
    void this.store.load(this.identity(), this.connector());
    void this.cards.load();
  }

  protected async start(): Promise<void> {
    const place = this.store.place();
    if (place && (await this.cards.useChosen())) {
      await this.starter.start(place, this.consent() === 'given');
    }
  }
}
