import { Client } from 'pg';
import { UuidV7 } from '../common/database/uuid-v7';
import { TestDatabase } from './test-database';

/** A person created for a test: their account and the Keycloak id their tokens carry. */
export interface TestPerson {
  accountId: string;
  keycloakId: string;
  email: string;
}

/**
 * Creates tenants, people and memberships directly in the test database, the way
 * platform admins and seed scripts will. System role ids come from the migration.
 */
export class TestData {
  static readonly ROLE_IDS = {
    owner: '00000000-0000-7000-8000-000000000001',
    operations: '00000000-0000-7000-8000-000000000002',
    finance: '00000000-0000-7000-8000-000000000003',
    technician: '00000000-0000-7000-8000-000000000004',
    readOnly: '00000000-0000-7000-8000-000000000005',
  };

  constructor(private readonly database: TestDatabase) {}

  async tenant(slug: string, status = 'active'): Promise<string> {
    const id = UuidV7.create();
    const name = slug.replace(/-/g, ' ');
    await this.sql('insert into tenants (id, name, slug, status) values ($1, $2, $3, $4)', [
      id,
      name,
      slug,
      status,
    ]);
    return id;
  }

  async person(email: string, name = ''): Promise<TestPerson> {
    const person = { accountId: UuidV7.create(), keycloakId: `kc-${UuidV7.create()}`, email };
    await this.sql(
      'insert into user_accounts (id, keycloak_id, email, name) values ($1, $2, $3, $4)',
      [person.accountId, person.keycloakId, email, name],
    );
    return person;
  }

  /** Makes the person an active member with one role, for the whole tenant or one site. */
  async member(tenantId: string, person: TestPerson, roleId: string, siteId: string | null = null) {
    const membershipId = UuidV7.create();
    await this.sql(
      `insert into tenant_memberships (id, tenant_id, user_account_id, status, joined_at)
       values ($1, $2, $3, 'active', now())`,
      [membershipId, tenantId, person.accountId],
    );
    await this.sql(
      'insert into membership_roles (id, tenant_id, membership_id, role_id, site_id) values ($1, $2, $3, $4, $5)',
      [UuidV7.create(), tenantId, membershipId, roleId, siteId],
    );
    return membershipId;
  }

  /** A tenant's own role holding exactly these permissions. */
  async customRole(tenantId: string, name: string, permissionKeys: string[]): Promise<string> {
    const id = UuidV7.create();
    await this.sql(
      'insert into roles (id, tenant_id, name, is_system) values ($1, $2, $3, false)',
      [id, tenantId, name],
    );
    for (const key of permissionKeys) {
      await this.sql(
        'insert into role_permissions (id, role_id, tenant_id, permission_key) values ($1, $2, $3, $4)',
        [UuidV7.create(), id, tenantId, key],
      );
    }
    return id;
  }

  async sql(text: string, values: unknown[] = []) {
    return this.database.asOwner((client: Client) => client.query(text, values));
  }
}
