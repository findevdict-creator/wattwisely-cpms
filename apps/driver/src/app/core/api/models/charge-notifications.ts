/** The e-mails a driver asked for about one charge (story NTF-01). The receipt always goes. */
export interface ChargeNotifications {
  /** null until the driver gives an address. */
  email: string | null;
  started: boolean;
  nearly_full: boolean;
  finished: boolean;
  idle_warning: boolean;
  /** The mail server refused the address: ask for another one. */
  is_undeliverable: boolean;
}

/** Body of PUT /v1/public/charges/{key}/notifications. */
export type ChargeNotificationsRequest = Omit<ChargeNotifications, 'email' | 'is_undeliverable'> & {
  email: string;
};
