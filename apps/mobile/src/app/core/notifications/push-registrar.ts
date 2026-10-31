import { Injectable, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DriverNotificationsApiService } from '@wattwisely/driver-core';
import { firstValueFrom } from 'rxjs';
import { MobileAuthService } from '../auth/mobile-auth.service';
import { NativePush } from '../native/native-push';

/**
 * Keeps the API told which phone the signed-in driver's pushes go to (module 34). At each
 * start with a sign-in, a phone that already allows notifications registers again, since
 * tokens change; the first charge started in the app asks the driver; signing out takes the
 * phone off. A tapped notification opens the charge or its receipt.
 */
@Injectable({ providedIn: 'root' })
export class PushRegistrar {
  static readonly PAGES = /^\/(charges|sessions)\/[\w-]+$/;

  private readonly push = inject(NativePush);
  private readonly api = inject(DriverNotificationsApiService);
  private readonly auth = inject(MobileAuthService);
  private readonly router = inject(Router);

  /** The token this phone registered for the signed-in driver. */
  private token: string | null = null;

  /** Runs once at start-up, in an injection context. */
  listen(): void {
    this.push.onOpen((data) => void this.open(data['url']));
    effect(() => {
      if (this.auth.hasSession()) {
        void this.enable();
      }
    });
  }

  /** Whether the phone now takes the driver's pushes; it asks first when isAsking. */
  async enable(isAsking = false): Promise<boolean> {
    const platform = this.push.platform();
    const token = platform ? await this.push.token(isAsking) : null;
    if (!platform || !token) {
      return false;
    }
    try {
      await firstValueFrom(this.api.registerDevice(platform, token));
      this.token = token;
      return true;
    } catch {
      return false;
    }
  }

  /** Before signing out: the phone stops receiving this driver's pushes. */
  async forget(isAccountDeleted: boolean): Promise<void> {
    const token = this.token;
    this.token = null;
    if (token && !isAccountDeleted) {
      await firstValueFrom(this.api.unregisterDevice(token)).catch(() => undefined);
    }
    await this.push.unregister();
  }

  private async open(url: unknown): Promise<void> {
    if (typeof url === 'string' && PushRegistrar.PAGES.test(url)) {
      await this.router.navigateByUrl(url);
    }
  }
}
