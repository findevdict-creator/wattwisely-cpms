/** One line in the bell (the portal inbox). */
export interface InboxItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  /** A portal path, e.g. /alerts/{id}. */
  link: string | null;
  alert_id: string | null;
  read_at: string | null;
  created_at: string;
}

/** One page of GET /v1/notifications. */
export interface InboxPage {
  items: InboxItem[];
  next_cursor: string | null;
  unread_count: number;
}

/** The caller's quiet hours (story NTF-03). */
export interface NotificationSettings {
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  time_zone: string;
}
