import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { BrandService } from '../../core/branding/brand.service';
import {
  ChargeChip,
  ChargeChips,
  ChargingNowStore,
  DurationPipe,
  Greeting,
  Money,
  MoneyPipe,
  MyChargesStore,
  ZonedTimePipe,
} from '@wattwisely/driver-core';
import { DriverAuthService } from '../../core/auth/driver-auth.service';
import { AccountStore } from '../account/account.store';
import { NearbyComponent } from './nearby.component';

/**
 * The home page: how to start (scan the QR code on the plug, or type what the sticker
 * says), and the charges this phone started, so the driver can get back to a receipt. The
 * form is a FormGroup so that Open, or Enter, submits it in the page.
 *
 * A logged-in driver also gets what the mobile app's Home has (module 37): the greeting, the
 * charge under way at any operator, the sites nearby and the operators they belong to.
 */
@Component({
  selector: 'ww-home',
  imports: [
    DurationPipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MoneyPipe,
    NearbyComponent,
    ReactiveFormsModule,
    RouterLink,
    ZonedTimePipe,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  providers: [AccountStore],
})
export class HomeComponent implements OnInit {
  protected readonly myCharges = inject(MyChargesStore);
  protected readonly account = inject(AccountStore);
  protected readonly chargingNow = inject(ChargingNowStore);
  protected readonly isLoggedIn = inject(DriverAuthService).isLoggedIn();
  protected readonly now = signal(Date.now());
  private readonly router = inject(Router);

  protected readonly greeting = computed(() =>
    Greeting.of(this.account.me()?.display_name ?? '', new Date(this.now())),
  );

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

  protected readonly form = new FormGroup({
    identity: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    plug: new FormControl('1', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{1,3}$/)],
    }),
  });

  /** The home page is the platform's: charges from several operators may be listed. */
  constructor() {
    inject(BrandService).reset();
  }

  ngOnInit(): void {
    if (this.isLoggedIn) {
      void this.account.load();
      void this.chargingNow.load();
    }
  }

  protected chipOf(status: string): ChargeChip {
    return ChargeChips.session(status);
  }

  protected isUnderWay(status: string): boolean {
    return ChargeChips.isUnderWay(status);
  }

  protected open(): void {
    if (this.form.valid) {
      const { identity, plug } = this.form.getRawValue();
      void this.router.navigate(['/c', identity.trim(), plug]);
    }
  }
}
