import { Injectable } from '@angular/core';
import { Capacitor, PluginListenerHandle, registerPlugin } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import type { DevicePlatform } from '@wattwisely/driver-core';

/** The app's own Android plugin (MainActivity): whether the build has Firebase's settings. */
interface PushSupportPlugin {
  isConfigured(): Promise<{ value: boolean }>;
}

/** Whether the phone lets the app notify: asked, refused, not asked yet, or not possible here. */
export type PushPermission = 'granted' | 'denied' | 'prompt' | 'unavailable';

/**
 * The phone's notifications (module 34), through `@capacitor/push-notifications`: Firebase
 * Cloud Messaging on Android, Apple's push service on iOS. An Android build without
 * `google-services.json` cannot take pushes, and Firebase would stop the app if asked, so the
 * app's PushSupport plugin is asked first. In a browser there are none.
 */
@Injectable({ providedIn: 'root' })
export class NativePush {
  static readonly CHANNEL = 'charging';
  static readonly TOKEN_WAIT_MS = 10_000;
  private static readonly SUPPORT = registerPlugin<PushSupportPlugin>('PushSupport');

  platform(): DevicePlatform | null {
    const platform = Capacitor.getPlatform();
    return platform === 'android' || platform === 'ios' ? platform : null;
  }

  async permission(): Promise<PushPermission> {
    if (!(await this.isAvailable())) {
      return 'unavailable';
    }
    const { receive } = await PushNotifications.checkPermissions();
    if (receive === 'granted' || receive === 'denied') {
      return receive;
    }
    return 'prompt';
  }

  /** The phone's push token; the phone asks the driver first when isAsking and not asked yet. */
  async token(isAsking: boolean): Promise<string | null> {
    const permission = await this.permission();
    if (permission === 'prompt' && isAsking) {
      const { receive } = await PushNotifications.requestPermissions();
      return receive === 'granted' ? this.register() : null;
    }
    return permission === 'granted' ? this.register() : null;
  }

  /** A notification the driver tapped: the data the worker put in it. */
  onOpen(listener: (data: Record<string, unknown>) => void): void {
    if (Capacitor.isNativePlatform()) {
      void PushNotifications.addListener('pushNotificationActionPerformed', (action) =>
        listener((action.notification.data ?? {}) as Record<string, unknown>),
      );
    }
  }

  /** This phone stops receiving pushes until the next register. */
  async unregister(): Promise<void> {
    if (await this.isAvailable()) {
      await PushNotifications.unregister().catch(() => undefined);
    }
  }

  private async isAvailable(): Promise<boolean> {
    const platform = this.platform();
    if (platform !== 'android') {
      return platform === 'ios';
    }
    try {
      return (await NativePush.SUPPORT.isConfigured()).value;
    } catch {
      return false;
    }
  }

  /** Android shows a push in the channel the worker names; the token comes as an event. */
  private async register(): Promise<string | null> {
    if (this.platform() === 'android') {
      await PushNotifications.createChannel({
        id: NativePush.CHANNEL,
        name: 'Charging',
        description: 'Your charge started, is nearly full, the idle fee, the receipt',
        importance: 4,
      });
    }
    return new Promise((resolve) => {
      const handles: Promise<PluginListenerHandle>[] = [];
      const done = (token: string | null) => {
        clearTimeout(timer);
        handles.forEach((handle) => void handle.then((listener) => listener.remove()));
        resolve(token);
      };
      const timer = setTimeout(() => done(null), NativePush.TOKEN_WAIT_MS);
      handles.push(PushNotifications.addListener('registration', (token) => done(token.value)));
      handles.push(PushNotifications.addListener('registrationError', () => done(null)));
      void PushNotifications.register().catch(() => done(null));
    });
  }
}
