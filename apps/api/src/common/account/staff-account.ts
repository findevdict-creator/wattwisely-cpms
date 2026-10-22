/** A person's row in user_accounts: one per person, shared by all their tenants. */
export class StaffAccount {
  constructor(
    readonly id: string,
    readonly email: string,
    readonly name: string,
  ) {}

  /** "Name <e-mail>", or just the e-mail when no name is known. Used in the audit log. */
  get label(): string {
    return this.name ? `${this.name} <${this.email}>` : this.email;
  }
}
