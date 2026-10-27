import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { DriverCharge } from '../../core/api/models/driver-payments';
import { BrandService } from '../../core/branding/brand.service';
import { MoneyPipe } from '../../shared/money.pipe';
import { ZonedTimePipe } from '../../shared/zoned-time.pipe';
import { ChargeHistory } from './charge-history';
import { MyChargesStore } from './my-charges.store';

/**
 * "Your charges" (module 19): every charge the login started or a card of theirs started, newest
 * first, by month, with a filter by operator when there is more than one.
 */
@Component({
  selector: 'ww-my-charges',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MoneyPipe,
    RouterLink,
    ZonedTimePipe,
  ],
  providers: [MyChargesStore],
  templateUrl: './my-charges.component.html',
  styleUrl: './my-charges.component.scss',
})
export class MyChargesComponent implements OnInit {
  protected readonly store = inject(MyChargesStore);

  /** The operator the list is narrowed to; empty for all of them. */
  protected readonly operator = signal('');
  protected readonly operators = computed(() => ChargeHistory.operators(this.store.charges()));
  protected readonly months = computed(() =>
    ChargeHistory.months(this.store.charges(), this.operator()),
  );

  constructor() {
    inject(BrandService).reset();
  }

  ngOnInit(): void {
    void this.store.load();
  }

  protected stateOf(charge: DriverCharge): string {
    return ChargeHistory.state(charge);
  }

  protected isRefused(charge: DriverCharge): boolean {
    return ChargeHistory.isRefused(charge);
  }
}
