import { Injectable, inject } from '@angular/core';
import { AlertController } from '@ionic/angular';

/** What a confirmation asks, and the words on its buttons. */
export interface ConfirmationQuestion {
  header: string;
  message: string;
  confirm: string;
  isDanger?: boolean;
}

/**
 * The phone's own dialog before a step the driver cannot take back (module 33): removing a
 * card, leaving an operator, deleting the account.
 */
@Injectable({ providedIn: 'root' })
export class Confirmation {
  static readonly CONFIRM = 'confirm';

  private readonly alerts = inject(AlertController);

  async ask(question: ConfirmationQuestion): Promise<boolean> {
    const alert = await this.alerts.create({
      header: question.header,
      message: question.message,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: question.confirm,
          role: Confirmation.CONFIRM,
          cssClass: question.isDanger ? 'ww-alert-danger' : '',
        },
      ],
    });
    await alert.present();
    return (await alert.onDidDismiss()).role === Confirmation.CONFIRM;
  }
}
