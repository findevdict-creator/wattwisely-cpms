import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import {
  ChargeHistory,
  DriverCharge,
  MonthTotals,
  MoneyPipe,
  ZonedTimePipe,
} from '@wattwisely/driver-core';
import { BrandService } from '../../core/branding/brand.service';
import { MyChargesStore } from './my-charges.store';

/**
 * "Your charges" (module 19): every charge the login started or a card of theirs started, newest
 * first, by month, with a filter by operator when there is more than one. Since module 38 the
 * latest two months' totals sit on top, as in the mobile app.
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
  static readonly TOTALS_SHOWN = 2;

  protected readonly store = inject(MyChargesStore);

  /** The operator the list is narrowed to; empty for all of them. */
  protected readonly operator = signal('');
  protected readonly operators = computed(() => ChargeHistory.operators(this.store.charges()));
  protected readonly months = computed(() =>
    ChargeHistory.months(this.store.charges(), this.operator()),
  );
  protected readonly totals = computed(() =>
    this.months()
      .slice(0, MyChargesComponent.TOTALS_SHOWN)
      .map((month) => MonthTotals.of(month)),
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
