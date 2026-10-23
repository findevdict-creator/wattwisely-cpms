import { UuidV7 } from '../client/uuid-v7';
import { TestData } from './test-data';

/** Where a test alert is. */
export interface AlertPlace {
  tenantId: string;
  siteId: string;
  chargerId: string;
}

/**
 * Module 11's rows for tests: alerts, routing rules, quiet hours, a driver's e-mail
 * subscription, report exports and schedules, written as the worker and the API would.
 */
export class TestNotifications {
  constructor(private readonly data: TestData) {}

  /** An open charger_offline alert unless the options say otherwise. */
  async alert(
    place: AlertPlace,
    options: {
      type?: string;
      status?: string;
      title?: string;
      beganAt?: Date;
      closedAt?: Date;
    } = {},
  ): Promise<string> {
    const id = UuidV7.create();
    await this.data.sql(
      `insert into alerts (id, tenant_id, type, status, subject_key, site_id, charger_id, title, began_at, closed_at)
       values ($1, $2, $3, $4, $5, $6, $5, $7, $8, $9)`,
      [
        id,
        place.tenantId,
        options.type ?? 'charger_offline',
        options.status ?? 'open',
        place.chargerId,
        place.siteId,
        options.title ?? 'CP-1 is offline',
        options.beganAt ?? new Date(),
        options.closedAt ?? null,
      ],
    );
    return id;
  }

  /** A routing rule: to a role or to one member, at one site or all of them. */
  async rule(
    tenantId: string,
    alertType: string,
    to: { roleId?: string; membershipId?: string; siteId?: string },
    channels: { isEmail: boolean; isInPortal: boolean } = { isEmail: true, isInPortal: true },
  ): Promise<string> {
    const id = UuidV7.create();
    await this.data.sql(
      `insert into alert_rules (id, tenant_id, alert_type, site_id, role_id, membership_id, is_email, is_in_portal)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        tenantId,
        alertType,
        to.siteId ?? null,
        to.roleId ?? null,
        to.membershipId ?? null,
        channels.isEmail,
        channels.isInPortal,
      ],
    );
    return id;
  }

  /** Quiet hours for a member, e.g. { start: '22:00', end: '07:00' } in UTC unless a zone is given. */
  async quietHours(
    tenantId: string,
    membershipId: string,
    hours: { start: string; end: string; timeZone?: string },
  ) {
    await this.data.sql(
      `insert into member_notification_settings (id, tenant_id, membership_id, quiet_hours_start, quiet_hours_end, time_zone)
       values ($1, $2, $3, $4, $5, $6)`,
      [UuidV7.create(), tenantId, membershipId, hours.start, hours.end, hours.timeZone ?? 'UTC'],
    );
  }

  /** A driver asked for e-mails about the session; every toggle on unless turned off. */
  async subscription(
    tenantId: string,
    sessionId: string,
    email: string,
    toggles: Partial<Record<'started' | 'nearlyFull' | 'finished' | 'idleWarning', boolean>> = {},
  ): Promise<string> {
    const id = UuidV7.create();
    await this.data.sql(
      `insert into session_subscriptions (id, tenant_id, session_id, email, wants_started, wants_nearly_full,
         wants_finished, wants_idle_warning)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        tenantId,
        sessionId,
        email,
        toggles.started ?? true,
        toggles.nearlyFull ?? true,
        toggles.finished ?? true,
        toggles.idleWarning ?? true,
      ],
    );
    return id;
  }

  /** A queued export of this kind and parameters. */
  async export(
    tenantId: string,
    kind: string,
    parameters: Record<string, unknown>,
    by: { accountId?: string; membershipId?: string; scheduleId?: string } = {},
  ): Promise<string> {
    const id = UuidV7.create();
    await this.data.sql(
      `insert into report_exports (id, tenant_id, kind, parameters, requested_by, membership_id, schedule_id, file_name)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        tenantId,
        kind,
        JSON.stringify(parameters),
        by.accountId ?? null,
        by.membershipId ?? null,
        by.scheduleId ?? null,
        `${kind}.csv`,
      ],
    );
    return id;
  }

  /** A weekly usage report schedule, due at `nextRunAt`. */
  async schedule(
    tenantId: string,
    recipients: string[],
    nextRunAt: Date,
    frequency = 'weekly',
  ): Promise<string> {
    const id = UuidV7.create();
    await this.data.sql(
      `insert into report_schedules (id, tenant_id, name, frequency, recipients, next_run_at)
       values ($1, $2, 'Weekly usage', $3, $4, $5)`,
      [id, tenantId, frequency, JSON.stringify(recipients), nextRunAt],
    );
    return id;
  }
}
