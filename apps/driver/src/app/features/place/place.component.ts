import { Component, OnInit, computed, effect, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { BrandService } from '../../core/branding/brand.service';
import { ChargeWords } from '../../shared/charge-words';
import { MoneyPipe } from '../../shared/money.pipe';
import { SupportContactComponent } from '../../shared/support-contact.component';
import { PlaceStore } from './place.store';
import { TariffSummaryComponent } from './tariff-summary.component';

/**
 * What the QR code on a plug opens: who runs the charger, where it is, whether the plug
 * is free, the prices, and the one button that starts a paid charge (module 6's public
 * charge). The hold is named before the driver pays, as the design asks. The page wears
 * the operator's brand as soon as the plug is known (module 8).
 */
@Component({
  selector: 'ww-place',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MoneyPipe,
    SupportContactComponent,
    TariffSummaryComponent,
  ],
  providers: [PlaceStore],
  templateUrl: './place.component.html',
  styleUrl: './place.component.scss',
})
export class PlaceComponent implements OnInit {
  readonly identity = input.required<string>();
  readonly connector = input.required<string>();

  protected readonly store = inject(PlaceStore);
  private readonly router = inject(Router);
  private readonly brandService = inject(BrandService);

  protected readonly canStart = computed(() => {
    const place = this.store.place();
    return place?.availability === 'available' && place.is_card_payment_accepted;
  });
  protected readonly availabilityLabel = computed(() =>
    ChargeWords.availability(this.store.place()?.availability ?? ''),
  );
  protected readonly plugDescription = computed(() => {
    const place = this.store.place();
    if (!place) {
      return '';
    }
    const parts = [
      ChargeWords.connectorType(place.connector_type),
      place.current_type?.toUpperCase() ?? '',
      place.max_power_kw ? `${place.max_power_kw} kW` : '',
    ];
    return parts.filter((part) => part).join(' · ');
  });

  constructor() {
    effect(() => {
      const place = this.store.place();
      if (place) {
        this.brandService.apply(place.branding);
      }
    });
  }

  ngOnInit(): void {
    void this.store.load(this.identity(), this.connector());
  }

  protected async start(): Promise<void> {
    const charge = await this.store.start();
    if (charge) {
      await this.router.navigate(['/charges', charge.charge_key]);
    }
  }
}
