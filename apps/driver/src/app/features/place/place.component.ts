import { Component, OnInit, computed, effect, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { DriverAuthService } from '../../core/auth/driver-auth.service';
import { BrandService } from '../../core/branding/brand.service';
import { ChargeChips } from '../../shared/charge-chips';
import { ChargeWords } from '../../shared/charge-words';
import { MoneyPipe } from '../../shared/money.pipe';
import { SupportContactComponent } from '../../shared/support-contact.component';
import { AccountStartComponent } from './account-start.component';
import { PlaceStore } from './place.store';
import { TariffSummaryComponent } from './tariff-summary.component';

/**
 * What the QR code on a plug opens: who runs the charger, where it is, whether the plug
 * is free, the prices, and the one button that starts a paid charge (module 6's public
 * charge). The hold is named before the driver pays, as the design asks. The page wears
 * the operator's brand as soon as the plug is known (module 8). A logged-in driver also
 * sees their own way to charge here (module 19): free, or with their saved card; anyone else is
 * offered the login under the card button. How to reach the operator closes the page.
 */
@Component({
  selector: 'ww-place',
  imports: [
    AccountStartComponent,
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
  /** `?chat=`: the conversation the driver came from (module 17); the charge reports back there. */
  readonly chat = input<string>();

  protected readonly store = inject(PlaceStore);
  protected readonly auth = inject(DriverAuthService);
  private readonly router = inject(Router);
  private readonly brandService = inject(BrandService);

  protected readonly canStart = computed(() => {
    const place = this.store.place();
    return place?.availability === 'available' && place.is_card_payment_accepted;
  });
  protected readonly availability = computed(() =>
    ChargeChips.availability(this.store.place()?.availability ?? ''),
  );
  protected readonly plugDescription = computed(() => {
    const place = this.store.place();
    if (!place) {
      return '';
    }
    const parts = [
      ChargeWords.connectorType(place.connector_type),
      place.current_type?.toUpperCase() ?? '',
      place.max_power_kw ? `up to ${place.max_power_kw} kW` : '',
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
    const charge = await this.store.start(this.chat());
    if (charge) {
      await this.router.navigate(['/charges', charge.charge_key]);
    }
  }
}
