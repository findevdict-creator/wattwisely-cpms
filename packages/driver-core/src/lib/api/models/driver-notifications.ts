/** The Notifications screen (module 34): what the driver hears about their charges, and how. */
export interface NotificationSettings {
  started: boolean;
  nearly_full: boolean;
  /** "Finished, with the receipt". */
  finished: boolean;
  idle_warning: boolean;
  is_push_enabled: boolean;
  /** E-mails besides the receipt, to the login's address, for charges started in the app. */
  is_email_enabled: boolean;
  email: string;
  /** How many phones are signed in to receive pushes. */
  device_count: number;
}

/** Body of PUT /v1/driver/me/notifications: every switch. */
export type NotificationSettingsChanges = Omit<NotificationSettings, 'email' | 'device_count'>;

/** The phones the push services reach. */
export type DevicePlatform = 'android' | 'ios';
