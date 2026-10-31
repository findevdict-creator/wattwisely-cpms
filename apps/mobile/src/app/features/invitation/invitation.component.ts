import { DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { IonButton, IonContent, IonSpinner, NavController } from '@ionic/angular';
import { InvitationStore } from '@wattwisely/driver-core';
import { AccountStore } from '../../core/account/account.store';
import { MobileAuthService } from '../../core/auth/mobile-auth.service';

/**
 * Where an operator's invitation e-mail leads when the app is installed (Figma 9,
 * "Invitation received"): who invites the driver, until when, and Accept or Decline. The
 * driver web app's page does the same in a browser; both use InvitationStore.
 */
@Component({
  selector: 'ww-invitation',
  imports: [DatePipe, IonButton, IonContent, IonSpinner, MatIconModule],
  providers: [InvitationStore],
  templateUrl: './invitation.component.html',
  styleUrl: './invitation.component.scss',
})
export class InvitationComponent {
  readonly token = input.required<string>();

  protected readonly store = inject(InvitationStore);
  protected readonly account = inject(AccountStore);
  protected readonly auth = inject(MobileAuthService);
  private readonly navController = inject(NavController);

  /** The signed-in address when it is not the one invited, which the API would refuse. */
  protected readonly otherLogin = computed(() => {
    const invited = this.store.invitation()?.email.toLowerCase() ?? '';
    const login = this.account.me()?.email ?? '';
    return login && login.toLowerCase() !== invited ? login : '';
  });

  ionViewWillEnter(): void {
    void this.store.load(this.token());
    void this.account.load();
  }

  protected async accept(): Promise<void> {
    if (await this.store.accept(this.token())) {
      await this.account.load();
      await this.navController.navigateRoot('/tabs/home');
    }
  }

  protected decline(): void {
    void this.store.decline(this.token());
  }

  protected home(): void {
    void this.navController.navigateRoot('/tabs/home');
  }
}
