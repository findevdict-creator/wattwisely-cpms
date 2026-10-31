import { Injectable } from '@angular/core';
import { Browser } from '@capacitor/browser';

/**
 * The phone's own browser sheet (Custom Tabs on Android, Safari on iOS), where Keycloak's
 * pages open. Signing in there, never inside the app's web view, keeps the password away
 * from the app and lets the phone fill it in.
 */
@Injectable({ providedIn: 'root' })
export class NativeBrowser {
  open(url: string): void {
    void Browser.open({ url, presentationStyle: 'popover' });
  }

  /** Closes the sheet once Keycloak has sent the phone back to the app; a no-op where unsupported. */
  async close(): Promise<void> {
    try {
      await Browser.close();
    } catch {
      // Android closes a Custom Tab by itself when the app comes back.
    }
  }
}
