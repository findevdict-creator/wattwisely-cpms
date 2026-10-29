import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonSpinner } from '@ionic/angular';
import { AccountData } from '../../core/account/account-data';
import { AccountStore } from '../../core/account/account.store';
import { Confirmation } from '../../shared/confirmation';
import { PageBarComponent } from '../../shared/page-bar.component';

/**
 * "Privacy and data" (Figma 11): the operators that hold a record of the driver, the download
 * of everything held about them, and deleting the account.
 */
@Component({
  selector: 'ww-privacy',
  imports: [
    DatePipe,
    IonButton,
    IonContent,
    IonSpinner,
    MatIconModule,
    PageBarComponent,
    RouterLink,
  ],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss',
})
export class PrivacyComponent {
  protected readonly store = inject(AccountStore);
  protected readonly data = inject(AccountData);
  private readonly confirmation = inject(Confirmation);

  ionViewWillEnter(): void {
    this.data.error.set('');
    void this.store.load();
  }

  protected async delete(): Promise<void> {
    const isSure = await this.confirmation.ask({
      header: 'Delete your account?',
      message:
        'Your login, your saved cards and the guest profiles your charges made go. Operators you are a member of keep their record of you, without your login. Receipts stay with the operators for tax. This cannot be undone.',
      confirm: 'Delete',
      isDanger: true,
    });
    if (isSure) {
      await this.data.delete();
    }
  }
}
