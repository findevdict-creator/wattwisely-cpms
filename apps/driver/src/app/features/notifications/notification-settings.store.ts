import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ApiProblem,
  DriverNotificationsApiService,
  NotificationSettings,
  NotificationSettingsChanges,
} from '@wattwisely/driver-core';

/** One switch of the Notifications page. */
export type NotificationSwitch = keyof NotificationSettingsChanges;

/**
 * The Notifications page behind the scenes (module 38): the same choices the mobile app keeps
 * (module 34), read and saved with the login. Each switch saves as it moves, and moves back if
 * the save fails. The browser itself gets no pushes; they go to the driver's phones.
 */
@Injectable()
export class NotificationSettingsStore {
  private readonly api = inject(DriverNotificationsApiService);

  readonly settings = signal<NotificationSettings | null>(null);
  readonly isSaving = signal(false);
  readonly error = signal('');

  async load(): Promise<void> {
    this.error.set('');
    try {
      this.settings.set(await firstValueFrom(this.api.settings()));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  async set(name: NotificationSwitch, isOn: boolean): Promise<void> {
    const before = this.settings();
    if (!before || before[name] === isOn) {
      return;
    }
    const after = { ...before, [name]: isOn };
    this.settings.set(after);
    this.isSaving.set(true);
    this.error.set('');
    try {
      this.settings.set(
        await firstValueFrom(this.api.update(NotificationSettingsStore.changes(after))),
      );
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
