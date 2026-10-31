import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { DriverOperator, PaymentModeWords } from '@wattwisely/driver-core';
import { AccountStore } from '../../core/account/account.store';
import { PageBarComponent } from '../../shared/page-bar.component';

/**
 * "My operators" (Figma 11): the operators the login is linked with, as a member or through a
 * charge, each opening what it holds about the driver. An invitation opens from its e-mail.
 */
@Component({
  selector: 'ww-my-operators',
  imports: [IonContent, MatIconModule, PageBarComponent, RouterLink],
  templateUrl: './my-operators.component.html',
  styleUrl: './operators.scss',
})
export class MyOperatorsComponent {
  protected readonly store = inject(AccountStore);

  ionViewWillEnter(): void {
    void this.store.load();
  }

  protected line(operator: DriverOperator): string {
    const reference = operator.reference ? `${operator.reference} · ` : '';
    return `${reference}${PaymentModeWords.short(operator.payment_mode)}`;
  }
}
