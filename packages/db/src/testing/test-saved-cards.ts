import { UuidV7 } from '../client/uuid-v7';
import { TestData } from './test-data';

/**
 * Module 19's driver logins and saved cards for tests, written directly: a login with a
 * customer at the provider, a default card on it, and the link to a tenant's driver record.
 */
export class TestSavedCards {
  constructor(private readonly data: TestData) {}

  /** A driver login, by default with a customer at the provider. */
  async login(email: string, customerId: string | null = `cus_${email.split('@')[0]}`) {
    const id = UuidV7.create();
    await this.data.sql(
      `insert into driver_accounts (id, keycloak_id, email, display_name, payment_customer_id)
       values ($1, $2, $3, $4, $5)`,
      [id, `kc-${id}`, email, email.split('@')[0], customerId],
    );
    return id;
  }

  /** A default card on the login; its provider id is returned, for a test that makes the bank refuse it. */
  async card(driverAccountId: string, last4 = '4242'): Promise<string> {
    const providerId = `pm_${UuidV7.create().replace(/-/g, '').slice(0, 16)}`;
    await this.data.sql(
      `insert into payment_methods (id, driver_account_id, provider_payment_method_id, brand, last4,
         exp_month, exp_year, is_default)
       values ($1, $2, $3, 'visa', $4, 12, 2030, true)`,
      [UuidV7.create(), driverAccountId, providerId, last4],
    );
    return providerId;
  }

  /** Links the login to a driver record, as an accepted invitation does. */
  async link(driverId: string, driverAccountId: string): Promise<void> {
    await this.data.sql(
      'update drivers set driver_account_id = $2, linked_at = now() where id = $1',
      [driverId, driverAccountId],
    );
  }
}
