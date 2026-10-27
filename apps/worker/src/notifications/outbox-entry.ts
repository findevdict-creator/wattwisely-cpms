import { MailContent } from '@wattwisely/mail';

/**
 * One e-mail to send later (the notifications outbox). The content is written when the
 * event happens, so sending needs nothing but the tenant's brand; a held alert e-mail is
 * still checked against its alert before it goes.
 */
export interface OutboxEntry {
  tenantId: string;
  kind: OutboxKind;
  /** Once-only: an entry with a key already in the outbox is dropped. */
  dedupeKey: string;
  toAddress: string;
  content: MailContent;
  /** The end of the recipient's quiet hours; now when left out. */
  sendAfter?: Date;
  sessionId?: string;
  alertId?: string;
  exportId?: string;
  membershipId?: string;
}

/** The e-mails the platform sends from the worker (module 11). */
export type OutboxKind =
  | 'session_started'
  | 'session_nearly_full'
  | 'session_charging_finished'
  | 'session_idle_fee_soon'
  | 'session_receipt'
  | 'session_hold_refused'
  | 'alert_opened'
  | 'export_ready'
  | 'scheduled_report';

/** Which kinds go to drivers: their replies go to the tenant's support address. */
export class OutboxKinds {
  static readonly DRIVER_KINDS: ReadonlySet<string> = new Set([
    'session_started',
    'session_nearly_full',
    'session_charging_finished',
    'session_idle_fee_soon',
    'session_receipt',
    'session_hold_refused',
  ]);

  static isDriverMail(kind: string): boolean {
    return OutboxKinds.DRIVER_KINDS.has(kind);
  }
}
