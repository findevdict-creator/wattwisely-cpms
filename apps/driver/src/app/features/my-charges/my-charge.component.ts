import { Component, OnInit, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { BrandService } from '../../core/branding/brand.service';
import { ChargeWords } from '../../shared/charge-words';
import { MoneyPipe } from '../../shared/money.pipe';
import { ZonedTimePipe } from '../../shared/zoned-time.pipe';
import { MyChargeStore } from './my-charge.store';

/** One of the driver's charges (module 19): where, how much, who pays, and a stop button while it runs. */
@Component({
  selector: 'ww-my-charge',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MoneyPipe,
    RouterLink,
    ZonedTimePipe,
  ],
  providers: [MyChargeStore],
  templateUrl: './my-charge.component.html',
  styleUrl: './my-charges.component.scss',
})
export class MyChargeComponent implements OnInit {
  readonly id = input.required<string>();

  protected readonly store = inject(MyChargeStore);

  constructor() {
    inject(BrandService).reset();
  }

  ngOnInit(): void {
    void this.store.follow(this.id());
  }

  protected status(status: string): string {
    return ChargeWords.session(status);
  }

  protected kwh(energyWh: number): string {
    return (energyWh / 1000).toFixed(2);
  }
}
