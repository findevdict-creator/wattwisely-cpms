import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { DriverNotificationsApiService, NotificationSettings } from '@wattwisely/driver-core';
import { of, throwError } from 'rxjs';
import { NotificationsComponent } from './notifications.component';
import { NotificationSettingsStore } from './notification-settings.store';

describe('NotificationSettingsStore', () => {
  const settings: NotificationSettings = {
    started: true,
    nearly_full: true,
    finished: true,
    idle_warning: true,
    is_push_enabled: true,
    is_email_enabled: false,
    email: 'dana@acme.test',
    device_count: 1,
  };

  const setUp = (update: jest.Mock) => {
    TestBed.configureTestingModule({
      providers: [
        NotificationSettingsStore,
        {
          provide: DriverNotificationsApiService,
          useValue: { settings: jest.fn(() => of(settings)), update },
        },
      ],
    });
    return TestBed.inject(NotificationSettingsStore);
  };

  it('saves every switch when one moves', async () => {
    const update = jest.fn((changes) => of({ ...settings, ...changes }));
    const store = setUp(update);
    await store.load();
    await store.set('is_email_enabled', true);
    expect(update).toHaveBeenCalledWith({
      started: true,
      nearly_full: true,
      finished: true,
      idle_warning: true,
      is_push_enabled: true,
      is_email_enabled: true,
    });
    expect(store.settings()?.is_email_enabled).toBe(true);
  });

  it('moves the switch back when the save fails', async () => {
    const refused = new HttpErrorResponse({ status: 500, error: { detail: 'Try again.' } });
    const store = setUp(jest.fn(() => throwError(() => refused)));
    await store.load();
    await store.set('started', false);
    expect(store.settings()?.started).toBe(true);
    expect(store.error()).toBe('Try again.');
  });

  it('says where pushes go, since this browser gets none', () => {
    expect(NotificationsComponent.phones(0)).toMatch(/once you sign in there/);
    expect(NotificationsComponent.phones(1)).toBe('To the Wattwisely app on your phone');
    expect(NotificationsComponent.phones(2)).toBe('To the Wattwisely app on 2 phones');
  });
});
