/** A driver's row in driver_accounts (module 19): one per person, shared by every operator they drive for. */
export class DriverAccount {
  constructor(
    readonly id: string,
    readonly email: string,
    readonly displayName: string,
    readonly phone: string | null,
  ) {}

  /** "Name <e-mail>", or just the e-mail when no name is known. Used in the audit log. */
  get label(): string {
    return this.displayName ? `${this.displayName} <${this.email}>` : this.email;
  }
}
