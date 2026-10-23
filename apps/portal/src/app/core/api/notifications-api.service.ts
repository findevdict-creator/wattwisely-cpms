import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { InboxPage, NotificationSettings } from './models/notification';

/** Calls /v1/notifications (the bell) and /v1/notification-settings (quiet hours). */
@Injectable({ providedIn: 'root' })
export class NotificationsApiService {
  static readonly PAGE_SIZE = 10;

  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  inbox(): Observable<InboxPage> {
    const params = new HttpParams().set('limit', NotificationsApiService.PAGE_SIZE);
    return this.http.get<InboxPage>(this.url('notifications'), { params });
  }

  markRead(id: string): Observable<{ unread_count: number }> {
    return this.http.post<{ unread_count: number }>(this.url(`notifications/${id}/read`), {});
  }

  markAllRead(): Observable<{ unread_count: number }> {
    return this.http.post<{ unread_count: number }>(this.url('notifications/read-all'), {});
  }

  settings(): Observable<NotificationSettings> {
    return this.http.get<NotificationSettings>(this.url('notification-settings'));
  }

  saveSettings(settings: NotificationSettings): Observable<NotificationSettings> {
    return this.http.put<NotificationSettings>(this.url('notification-settings'), settings);
  }

  private url(path: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/${path}`;
  }
}
