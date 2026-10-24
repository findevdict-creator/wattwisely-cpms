import { UuidV7 } from '../client/uuid-v7';
import { TestData } from './test-data';

/**
 * Module 13's rows for tests: drivers, their RFID cards and access groups, written as the
 * API would. A driver is active unless said otherwise; a card is active with no end date.
 */
export class TestDrivers {
  constructor(private readonly data: TestData) {}

  async driver(
    tenantId: string,
    name: string,
    options: { email?: string | null; status?: string; reference?: string } = {},
  ): Promise<string> {
    const id = UuidV7.create();
    await this.data.sql(
      `insert into drivers (id, tenant_id, name, email, reference, status, blocked_at)
       values ($1, $2, $3, $4, $5, $6::driver_status, case when $6::text = 'blocked' then now() end)`,
      [
        id,
        tenantId,
        name,
        options.email ?? null,
        options.reference ?? '',
        options.status ?? 'active',
      ],
    );
    return id;
  }

  async card(
    tenantId: string,
    driverId: string,
    idTag: string,
    options: { status?: string; expiresAt?: Date | null; label?: string } = {},
  ): Promise<string> {
    const id = UuidV7.create();
    await this.data.sql(
      `insert into rfid_cards (id, tenant_id, driver_id, id_tag, label, status, expires_at)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        tenantId,
        driverId,
        idTag,
        options.label ?? '',
        options.status ?? 'active',
        options.expiresAt ?? null,
      ],
    );
    return id;
  }

  /** A group with these sites and drivers. */
  async group(
    tenantId: string,
    name: string,
    members: { siteIds?: string[]; driverIds?: string[] } = {},
  ): Promise<string> {
    const id = UuidV7.create();
    await this.data.sql('insert into access_groups (id, tenant_id, name) values ($1, $2, $3)', [
      id,
      tenantId,
      name,
    ]);
    for (const siteId of members.siteIds ?? []) {
      await this.data.sql(
        'insert into access_group_sites (tenant_id, group_id, site_id) values ($1, $2, $3)',
        [tenantId, id, siteId],
      );
    }
    for (const driverId of members.driverIds ?? []) {
      await this.data.sql(
        'insert into access_group_members (tenant_id, group_id, driver_id) values ($1, $2, $3)',
        [tenantId, id, driverId],
      );
    }
    return id;
  }
}
