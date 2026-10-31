import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { IonButton, IonContent, IonInput, IonSpinner } from '@ionic/angular';
import { AccountStore } from '../../core/account/account.store';
import { MobileAuthService } from '../../core/auth/mobile-auth.service';
import { PageBarComponent } from '../../shared/page-bar.component';

/**
 * "Personal details" (Figma 11, Account): the name and phone the driver gives themselves,
 * kept by the API; the e-mail and the password are Keycloak's, changed on its own page.
 * An operator keeps its own record of the driver, which this does not change.
 */
@Component({
  selector: 'ww-personal-details',
  imports: [IonButton, IonContent, IonInput, IonSpinner, MatIconModule, PageBarComponent],
  templateUrl: './personal-details.component.html',
  styleUrl: './personal-details.component.scss',
})
export class PersonalDetailsComponent {
  protected readonly store = inject(AccountStore);
  private readonly auth = inject(MobileAuthService);

  protected readonly name = signal('');
  protected readonly phone = signal('');
  protected readonly isSaving = signal(false);
  protected readonly isSaved = signal(false);

  async ionViewWillEnter(): Promise<void> {
    this.isSaved.set(false);
    await this.store.load();
    this.name.set(this.store.me()?.display_name ?? '');
    this.phone.set(this.store.me()?.phone ?? '');
  }

  protected async save(): Promise<void> {
    this.isSaving.set(true);
    this.isSaved.set(await this.store.save(this.name(), this.phone()));
    this.isSaving.set(false);
  }

  protected openAccount(): void {
    this.auth.openAccount();
  }
}
