import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import {
  DevicePlatform,
  NotificationSettings,
  NotificationSettingsChanges,
} from './models/driver-notifications';

/** The driver's notification choices and the phones that receive pushes (module 34). */
@Injectable({ providedIn: 'root' })
export class DriverNotificationsApiService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  settings(): Observable<NotificationSettings> {
    return this.http.get<NotificationSettings>(this.url('me/notifications'));
  }

  update(changes: NotificationSettingsChanges): Observable<NotificationSettings> {
    return this.http.put<NotificationSettings>(this.url('me/notifications'), changes);
  }

  /** The phone's push token, for the signed-in driver; a token another login had moves here. */
  registerDevice(platform: DevicePlatform, token: string): Observable<void> {
    return this.http.put<void>(this.url('devices'), { platform, token });
  }

  unregisterDevice(token: string): Observable<void> {
    return this.http.delete<void>(this.url(`devices/${encodeURIComponent(token)}`));
  }

  private url(path: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/driver/${path}`;
  }
}
