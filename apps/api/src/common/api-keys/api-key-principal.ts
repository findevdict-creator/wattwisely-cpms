import { StaffAccount } from '../account/staff-account';

/**
 * The API key behind a request (module 16): which key, in which tenant, and the member it
 * acts for. The audit log names the key as the actor; rows that need a person (created_by)
 * name the member who made the key.
 */
export class ApiKeyPrincipal {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly tenantId: string,
    readonly account: StaffAccount,
  ) {}

  /** How the audit log labels the key, e.g. `API key "Fleet sync"`. */
  get label(): string {
    return `API key "${this.name}"`;
  }
}
