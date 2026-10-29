import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent } from '@ionic/angular';
import { Initials } from '@wattwisely/driver-core';
import { AccountStore } from '../../core/account/account.store';
import { ChargingNowStore } from '../../core/charging/charging-now.store';
import { MobileAuthService } from '../../core/auth/mobile-auth.service';
import { NativeApp } from '../../core/native/native-app';

/**
 * The Account tab (Figma 11, "Account"): who is signed in, the way out, and the app's
 * version. Payment methods, operators, notifications and privacy join it in later modules.
 */
@Component({
  selector: 'ww-account',
  imports: [IonButton, IonContent],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
})
export class AccountComponent {
  protected readonly store = inject(AccountStore);
  private readonly chargingNow = inject(ChargingNowStore);
  private readonly auth = inject(MobileAuthService);
  private readonly router = inject(Router);
  private readonly nativeApp = inject(NativeApp);

  protected readonly version = signal('');
  protected readonly initials = computed(() => Initials.of(this.store.me()?.display_name ?? ''));

  ionViewWillEnter(): void {
    void this.store.load();
    void this.nativeApp.version().then((version) => this.version.set(version));
  }

  protected signOut(): void {
    this.auth.logout();
    this.store.clear();
    this.chargingNow.clear();
    void this.router.navigateByUrl('/welcome', { replaceUrl: true });
  }
}
