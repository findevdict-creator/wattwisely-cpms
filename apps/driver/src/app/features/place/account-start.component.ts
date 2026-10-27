import { TitleCasePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { Place } from '../../core/api/models/place';
import { MoneyPipe } from '../../shared/money.pipe';
import { AccountStartStore } from './account-start.store';

/**
 * "Charge with your account" on the plug page (module 19). A free rule starts at once; a paid
 * one holds the default saved card with no card form. The first charge at an operator that has
 * no record of the driver asks their consent to keep one. The plug page offers the login itself.
 */
@Component({
  selector: 'ww-account-start',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MoneyPipe,
    RouterLink,
    TitleCasePipe,
  ],
  providers: [AccountStartStore],
  templateUrl: './account-start.component.html',
  styleUrl: './place.component.scss',
})
export class AccountStartComponent implements OnInit {
  readonly place = input.required<Place>();

  protected readonly store = inject(AccountStartStore);
  private readonly router = inject(Router);
  protected readonly isConsentGiven = signal(false);

  ngOnInit(): void {
    void this.store.load(this.place().charger_identity, String(this.place().ocpp_connector_id));
  }

  protected async start(): Promise<void> {
    const place = this.place();
    const charge = await this.store.start(
      place.charger_identity,
      place.ocpp_connector_id,
      this.isConsentGiven(),
    );
    if (charge) {
      await this.router.navigate(['/account/charges', charge.id]);
    }
  }
}
