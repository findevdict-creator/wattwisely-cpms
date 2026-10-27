import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { BrandService } from '../../core/branding/brand.service';
import { ChargeWords } from '../../shared/charge-words';
import { MoneyPipe } from '../../shared/money.pipe';
import { ZonedTimePipe } from '../../shared/zoned-time.pipe';
import { MyChargesStore } from './my-charges.store';

/** "Your charges" (module 19): every charge the login started or a card of theirs started, newest first. */
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

  constructor() {
    inject(BrandService).reset();
  }

  ngOnInit(): void {
    void this.store.load();
  }

  protected status(status: string): string {
    return ChargeWords.session(status);
  }
}
