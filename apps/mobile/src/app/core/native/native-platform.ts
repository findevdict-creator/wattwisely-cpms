import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

/** Whether the app runs in the Android or iOS shell, or in a browser while developing. */
@Injectable({ providedIn: 'root' })
export class NativePlatform {
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }
}
