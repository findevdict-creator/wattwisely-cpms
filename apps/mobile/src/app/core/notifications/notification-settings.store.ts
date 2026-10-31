import { Injectable, inject, signal } from '@angular/core';
import {
  ApiProblem,
  DriverNotificationsApiService,
  NotificationSettings,
  NotificationSettingsChanges,
} from '@wattwisely/driver-core';
import { firstValueFrom } from 'rxjs';
import { NativePush, PushPermission } from '../native/native-push';
import { PushRegistrar } from './push-registrar';

/** One switch of the Notifications screen. */
export type NotificationSwitch = keyof NotificationSettingsChanges;

/**
 * The Notifications screen behind the page (module 34). Each switch saves as it moves, as
 * the phone's own settings do, and moves back if the save fails. Turning pushes on asks the
 * phone too, the first time.
 */
@Injectable({ providedIn: 'root' })
export class NotificationSettingsStore {
  private readonly api = inject(DriverNotificationsApiService);
  private readonly push = inject(NativePush);
  private readonly registrar = inject(PushRegistrar);

  readonly settings = signal<NotificationSettings | null>(null);
  readonly phone = signal<PushPermission>('unavailable');
  readonly isSaving = signal(false);
  readonly error = signal('');

  async load(): Promise<void> {
    this.error.set('');
    try {
      const [settings, phone] = await Promise.all([
        firstValueFrom(this.api.settings()),
        this.push.permission(),
      ]);
      this.settings.set(settings);
      this.phone.set(phone);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  async set(name: NotificationSwitch, isOn: boolean): Promise<void> {
    const before = this.settings();
    if (!before || before[name] === isOn) {
      return;
    }
    this.settings.set({ ...before, [name]: isOn });
    this.isSaving.set(true);
    this.error.set('');
    try {
      if (name === 'is_push_enabled' && isOn) {
        await this.registrar.enable(true);
        this.phone.set(await this.push.permission());
      }
      const changes = NotificationSettingsStore.changes({ ...before, [name]: isOn });
      this.settings.set(await firstValueFrom(this.api.update(changes)));
    } catch (error) {
      this.settings.set(before);
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }

  static changes(settings: NotificationSettings): NotificationSettingsChanges {
    return {
      started: settings.started,
      nearly_full: settings.nearly_full,
      finished: settings.finished,
      idle_warning: settings.idle_warning,
      is_push_enabled: settings.is_push_enabled,
      is_email_enabled: settings.is_email_enabled,
    };
  }
}
