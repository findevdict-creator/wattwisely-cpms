import { Component, OnInit, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RouterLink } from '@angular/router';
import { BrandService } from '../../core/branding/brand.service';
import { NotificationSettingsStore, NotificationSwitch } from './notification-settings.store';

/** One switch on the page, with the mobile app's words. */
interface SwitchRow {
  name: NotificationSwitch;
  title: string;
  line: string;
}

/**
 * "Notifications" (module 38), as in the mobile app (module 34): what the driver hears about
 * the charges they start with the login, here or in the app, and how: e-mails to the login's
 * address, and pushes to the phones signed in to the app. Each switch saves at once.
 */
@Component({
  selector: 'ww-notifications',
  imports: [MatIconModule, MatProgressSpinnerModule, MatSlideToggleModule, RouterLink],
  providers: [NotificationSettingsStore],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
})
export class NotificationsComponent implements OnInit {
  static readonly EVENTS: SwitchRow[] = [
    { name: 'started', title: 'Charging started', line: 'When the charger confirms the start' },
    { name: 'nearly_full', title: 'Nearly full', line: 'At 80%, when the car reports it' },
    {
      name: 'finished',
      title: 'Finished, with the receipt',
      line: 'When the charge ends and is priced',
    },
    {
      name: 'idle_warning',
      title: 'Idle fee warning',
      line: 'Five minutes before the idle fee starts',
    },
  ];

  protected readonly store = inject(NotificationSettingsStore);
  protected readonly events = NotificationsComponent.EVENTS;

  protected readonly channels = computed<SwitchRow[]>(() => {
    const settings = this.store.settings();
    return [
      { name: 'is_email_enabled', title: 'E-mail', line: settings?.email ?? '' },
      {
        name: 'is_push_enabled',
        title: 'Push notifications',
        line: NotificationsComponent.phones(settings?.device_count ?? 0),
      },
    ];
  });

  constructor() {
    inject(BrandService).reset();
  }

  ngOnInit(): void {
    void this.store.load();
  }

  protected change(name: NotificationSwitch, isOn: boolean): void {
    void this.store.set(name, isOn);
  }

  /** Pushes reach the phones signed in to the app, never this browser. */
  static phones(count: number): string {
    if (count === 0) {
      return 'In the Wattwisely app on your phone, once you sign in there';
    }
    return `To the Wattwisely app on ${count === 1 ? 'your phone' : `${count} phones`}`;
  }
}
