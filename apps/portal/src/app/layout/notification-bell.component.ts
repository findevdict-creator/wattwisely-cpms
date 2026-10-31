import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { InboxItem } from '../core/api/models/notification';
import { NotificationsApiService } from '../core/api/notifications-api.service';

/** The bell in the top bar: the latest portal notifications, with the unread ones counted (story NTF-03). */
@Component({
  selector: 'ww-notification-bell',
  imports: [DatePipe, MatButtonModule, MatIconModule, MatMenuModule],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss',
})
export class NotificationBellComponent {
  private readonly notificationsApi = inject(NotificationsApiService);
  private readonly router = inject(Router);

  protected readonly items = signal<InboxItem[]>([]);
  protected readonly unread = signal(0);

  /** Called by the shell when it starts and then every minute. */
  async refresh(): Promise<void> {
    try {
      const page = await firstValueFrom(this.notificationsApi.inbox());
      this.items.set(page.items);
      this.unread.set(page.unread_count);
    } catch {
      // The bell keeps what it showed; the next refresh tries again.
    }
  }

  protected async open(item: InboxItem): Promise<void> {
    if (!item.read_at) {
      const result = await firstValueFrom(this.notificationsApi.markRead(item.id));
      this.unread.set(result.unread_count);
      this.items.update((items) =>
        items.map((candidate) =>
          candidate.id === item.id
            ? { ...candidate, read_at: new Date().toISOString() }
            : candidate,
        ),
      );
    }
    if (item.link) {
      await this.router.navigateByUrl(item.link);
    }
  }

  protected async markAllRead(): Promise<void> {
    const result = await firstValueFrom(this.notificationsApi.markAllRead());
    this.unread.set(result.unread_count);
    const now = new Date().toISOString();
    this.items.update((items) => items.map((item) => ({ ...item, read_at: item.read_at ?? now })));
  }
}
