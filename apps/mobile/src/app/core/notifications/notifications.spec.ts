import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { DriverNotificationsApiService, NotificationSettings } from '@wattwisely/driver-core';
import { of, throwError } from 'rxjs';
import { MobileAuthService } from '../auth/mobile-auth.service';
import { NativePush } from '../native/native-push';
import { NotificationSettingsStore } from './notification-settings.store';
import { PushRegistrar } from './push-registrar';

describe('Notifications in the app', () => {
  const settings: NotificationSettings = {
    started: true,
    nearly_full: true,
    finished: true,
    idle_warning: true,
    is_push_enabled: false,
    is_email_enabled: false,
    email: 'dana@acme.test',
    device_count: 0,
  };

  function setUp(api: Partial<Record<keyof DriverNotificationsApiService, jest.Mock>>) {
    const push = {
      platform: jest.fn(() => 'android'),
      permission: jest.fn(async () => 'granted'),
      token: jest.fn(async () => 'fcm-token-of-danas-phone'),
      onOpen: jest.fn(),
      unregister: jest.fn(async () => undefined),
    };
    const router = { navigateByUrl: jest.fn(async () => true) };
    TestBed.configureTestingModule({
      providers: [
        { provide: DriverNotificationsApiService, useValue: api },
        { provide: NativePush, useValue: push },
        { provide: MobileAuthService, useValue: { hasSession: () => false } },
        { provide: Router, useValue: router },
      ],
    });
    return {
      store: TestBed.inject(NotificationSettingsStore),
      registrar: TestBed.inject(PushRegistrar),
      push,
      router,
    };
  }

  it('turns pushes on: the phone is asked and registered, then the choice saved', async () => {
    const registerDevice = jest.fn(() => of(undefined));
    const update = jest.fn(() => of({ ...settings, is_push_enabled: true, device_count: 1 }));
    const { store, push } = setUp({
      settings: jest.fn(() => of(settings)),
      registerDevice,
      update,
    });
    await store.load();
    await store.set('is_push_enabled', true);
    expect(push.token).toHaveBeenCalledWith(true);
    expect(registerDevice).toHaveBeenCalledWith('android', 'fcm-token-of-danas-phone');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ is_push_enabled: true }));
    expect(store.settings()?.device_count).toBe(1);
  });

  it('moves a switch back when the save fails', async () => {
    const problem = new HttpErrorResponse({ status: 500, error: { detail: 'Try again.' } });
    const update = jest.fn(() => throwError(() => problem));
    const { store } = setUp({ settings: jest.fn(() => of(settings)), update });
    await store.load();
    await store.set('started', false);
    expect(store.settings()?.started).toBe(true);
    expect(store.error()).toBe('Try again.');
  });

  it('takes the phone off at sign-out, and only opens the app’s own pages from a push', async () => {
    const unregisterDevice = jest.fn(() => of(undefined));
    const { registrar, push, router } = setUp({
      registerDevice: jest.fn(() => of(undefined)),
      unregisterDevice,
    });
    let open: (data: Record<string, unknown>) => void = () => undefined;
    push.onOpen.mockImplementation((listener) => (open = listener));
    TestBed.runInInjectionContext(() => registrar.listen());

    expect(await registrar.enable()).toBe(true);
    await registrar.forget(false);
    expect(unregisterDevice).toHaveBeenCalledWith('fcm-token-of-danas-phone');
    expect(push.unregister).toHaveBeenCalled();

    open({ url: '/sessions/session-1' });
    open({ url: 'https://elsewhere.example/phish' });
    expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/sessions/session-1');
  });
});
