import { UuidV7 } from '../client/uuid-v7';
import { TestData, TestPerson } from './test-data';

/**
 * The managed tenant rows for tests (module 10): a service agreement in a given state and
 * the staff assigned to a tenant as its Managed operator. The role itself comes from
 * migration 0016.
 */
export class TestManaged {
  constructor(private readonly data: TestData) {}

  /** An agreement for the tenant, looked after by the given staff member (their platform_staff id). */
  async service(
    tenantId: string,
    accountManagerId: string,
    status = 'active',
    options: { isTariffApprovalRequired?: boolean; endsAt?: Date } = {},
  ): Promise<string> {
    const id = UuidV7.create();
    const isAccepted = status !== 'pending_acceptance' && status !== 'withdrawn';
    await this.data.sql(
      `insert into managed_services (id, tenant_id, status, account_manager_id, is_tariff_approval_required,
         accepted_at, ends_at, notice_given_at)
       values ($1, $2, $3, $4, $5, case when $6 then now() end, $7, case when $7::timestamptz is null then null else now() end)`,
      [
        id,
        tenantId,
        status,
        accountManagerId,
        options.isTariffApprovalRequired ?? true,
        isAccepted,
        options.endsAt ?? null,
      ],
    );
    return id;
  }

  /** Makes the person the tenant's Managed operator: an active membership with the role, and the assignment. */
  async operator(tenantId: string, serviceId: string, person: TestPerson): Promise<string> {
    const membershipId = await this.data.member(
      tenantId,
      person,
      TestData.ROLE_IDS.managedOperator,
    );
    const id = UuidV7.create();
    await this.data.sql(
      `insert into managed_operators (id, tenant_id, managed_service_id, user_account_id, membership_id)
       values ($1, $2, $3, $4, $5)`,
      [id, tenantId, serviceId, person.accountId, membershipId],
    );
    return id;
  }
}
