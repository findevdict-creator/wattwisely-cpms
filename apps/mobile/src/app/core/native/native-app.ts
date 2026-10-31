import { Injectable } from '@angular/core';
import { App } from '@capacitor/app';

/**
 * The app's own events from the phone: a link that opened it (the sign-in coming back from
 * Keycloak), and its return to the foreground. Kept behind this class so tests can stand in.
 */
@Injectable({ providedIn: 'root' })
export class NativeApp {
  onUrlOpen(listener: (url: string) => void): void {
    void App.addListener('appUrlOpen', (event) => listener(event.url));
  }

  onResume(listener: () => void): void {
    void App.addListener('resume', listener);
  }

  /** "1.0.0 (12)": the store version and build number; empty in a browser. */
  async version(): Promise<string> {
    try {
      const info = await App.getInfo();
      return `${info.version} (${info.build})`;
    } catch {
      return '';
    }
  }
}
