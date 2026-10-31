import { Component, computed, inject } from '@angular/core';
import { IonContent, IonSpinner, IonToggle } from '@ionic/angular';
import {
  NotificationSettingsStore,
  NotificationSwitch,
} from '../../core/notifications/notification-settings.store';
import { PushWords } from '../../core/notifications/push-words';
import { PageBarComponent } from '../../shared/page-bar.component';

/** One switch on the screen, with the design's words. */
interface SwitchRow {
  name: NotificationSwitch;
  title: string;
  line: string;
}

/**
 * "Notifications" (Figma 11, NTF-01): what the driver hears about their charges, and how:
 * pushes to this phone, and e-mails to the login's address. Each switch saves at once.
 */
@Component({
  selector: 'ww-notifications',
  imports: [IonContent, IonSpinner, IonToggle, PageBarComponent],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
})
export class NotificationsComponent {
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
      {
        name: 'is_push_enabled',
        title: 'Push notifications',
        line: PushWords.phone(this.store.phone(), settings?.is_push_enabled ?? false),
      },
      { name: 'is_email_enabled', title: 'E-mail', line: settings?.email ?? '' },
    ];
  });

  ionViewWillEnter(): void {
    void this.store.load();
  }

  protected change(name: NotificationSwitch, event: CustomEvent<{ checked: boolean }>): void {
    void this.store.set(name, event.detail.checked);
  }
}
