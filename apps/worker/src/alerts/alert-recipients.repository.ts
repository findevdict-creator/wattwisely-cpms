import { Injectable } from '@nestjs/common';
import { eq, sql, SQL } from 'drizzle-orm';
import { alertRules, Transaction } from '@wattwisely/db';
import { AlertType } from './alert-finding';
import { QuietHoursSetting } from './quiet-hours';

/** Someone an alert goes to, and how. */
export interface AlertRecipient {
  membershipId: string;
  email: string;
  isEmail: boolean;
  isInPortal: boolean;
  quietHours: QuietHoursSetting | null;
}

/** A row of the recipients query. */
interface RecipientRow extends Record<string, unknown> {
  membership_id: string;
  email: string;
  is_email: boolean;
  is_in_portal: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  time_zone: string | null;
}

/**
 * Who hears about an alert (NTF-03): the tenant's routing rules for the alert type and
 * the site, by role or by person. A tenant that set no rules for a type gets the defaults:
 * Owners, Operations and Managed operators by e-mail and in the portal, Technicians in the
 * portal. Nobody hears about a site they may not see alerts for.
 */
@Injectable()
export class AlertRecipientsRepository {
  static readonly DEFAULT_RULES = sql`(values
    ('owner', true, true), ('operations', true, true), ('managed-operator', true, true),
    ('technician', false, true)) as d(role_key, is_email, is_in_portal)`;

  async find(tx: Transaction, type: AlertType, siteId: string): Promise<AlertRecipient[]> {
    const rules = await this.rules(tx, type, siteId);
    const result = await tx.execute<RecipientRow>(sql`
      with rules as (${rules}),
      targets as (
        select mr.membership_id, r.is_email, r.is_in_portal from rules r
          join membership_roles mr on mr.role_id = r.role_id and (mr.site_id is null or mr.site_id = ${siteId})
        union all
        select r.membership_id, r.is_email, r.is_in_portal from rules r where r.membership_id is not null)
      select m.id as membership_id, u.email, bool_or(t.is_email) as is_email,
        bool_or(t.is_in_portal) as is_in_portal, s.quiet_hours_start, s.quiet_hours_end, s.time_zone
      from targets t
      join tenant_memberships m on m.id = t.membership_id and m.status = 'active'
      join user_accounts u on u.id = m.user_account_id
      left join member_notification_settings s on s.membership_id = m.id
      where exists (select 1 from membership_roles g join role_permissions p on p.role_id = g.role_id
        where g.membership_id = m.id and p.permission_key = 'alerts:read'
          and (g.site_id is null or g.site_id = ${siteId}))
      group by m.id, u.email, s.quiet_hours_start, s.quiet_hours_end, s.time_zone
      order by u.email`);
    return result.rows.map((row) => AlertRecipientsRepository.toRecipient(row));
  }

  private static toRecipient(row: RecipientRow): AlertRecipient {
    const hasQuietHours = Boolean(row.quiet_hours_start && row.quiet_hours_end);
    return {
      membershipId: row.membership_id,
      email: row.email,
      isEmail: row.is_email,
      isInPortal: row.is_in_portal,
      quietHours: hasQuietHours
        ? {
            start: row.quiet_hours_start as string,
            end: row.quiet_hours_end as string,
            timeZone: row.time_zone ?? 'UTC',
          }
        : null,
    };
  }

  /** The tenant's rules for this type and site, or the defaults when it has none for the type. */
  private async rules(tx: Transaction, type: AlertType, siteId: string): Promise<SQL> {
    const [saved] = await tx
      .select({ id: alertRules.id })
      .from(alertRules)
      .where(eq(alertRules.alertType, type))
      .limit(1);
    if (saved) {
      return sql`select role_id, membership_id, is_email, is_in_portal from alert_rules
        where alert_type = ${type} and (site_id is null or site_id = ${siteId})`;
    }
    return sql`select ro.id as role_id, null::uuid as membership_id, d.is_email, d.is_in_portal
      from ${AlertRecipientsRepository.DEFAULT_RULES} join roles ro on ro.key = d.role_key and ro.tenant_id is null`;
  }
}
