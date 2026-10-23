import {
  foreignKey,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { tariffProposalStatus } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { TariffWeekday } from './tariff-versions.table';
import { tariffs } from './tariffs.table';
import { tenants } from './tenants.table';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * The prices a tariff proposal carries: the API's tariff prices body, kept exactly as the
 * operator sent it (API field names, decimal strings), so approving replays it as a request.
 */
export interface ProposedTariffPrices {
  tax_rate: string;
  is_tax_included: boolean;
  start_fee: number;
  idle_grace_minutes: number;
  idle_fee_cap?: number | null;
  minimum_price?: number | null;
  maximum_price?: number | null;
  is_free_without_energy: boolean;
  bands: ProposedTariffBand[];
  note?: string;
}

/** One band of a proposal, in the API's shape. */
export interface ProposedTariffBand {
  name: string;
  days: TariffWeekday[];
  start: string;
  end: string;
  energy_price_per_kwh: string;
  time_price_per_hour: string;
  idle_fee_per_minute: string;
}

/**
 * A tariff change a Managed operator proposed for the tenant's Owner to approve (story
 * MGT-03). Without a tariff it proposes a new tariff; with one it proposes new prices for
 * that tariff. Approving creates the tariff or adds the version and records which; rejecting
 * keeps the proposal with the Owner's comment. Only the tenant itself reads and writes them.
 */
export const tariffProposals = pgTable(
  'tariff_proposals',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    /** The tariff the new prices are for, or null for a new tariff. */
    tariffId: uuid('tariff_id'),
    name: text('name').notNull(),
    currency: text('currency').notNull(),
    prices: jsonb('prices').$type<ProposedTariffPrices>().notNull(),
    status: tariffProposalStatus('status').notNull().default('proposed'),
    /** Why the operator proposes the change, shown to the Owner. */
    note: text('note').notNull().default(''),
    proposedBy: uuid('proposed_by')
      .notNull()
      .references(() => userAccounts.id),
    proposedAt: timestamp('proposed_at', { withTimezone: true }).notNull().defaultNow(),
    decidedBy: uuid('decided_by').references(() => userAccounts.id),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    decisionComment: text('decision_comment').notNull().default(''),
    /** After approval: the tariff that was created or changed. */
    appliedTariffId: uuid('applied_tariff_id'),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    foreignKey({
      name: 'tariff_proposals_tariff_fk',
      columns: [table.tenantId, table.tariffId],
      foreignColumns: [tariffs.tenantId, tariffs.id],
    }),
    index('tariff_proposals_status_idx').on(table.tenantId, table.status),
    pgPolicy('tariff_proposals_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
