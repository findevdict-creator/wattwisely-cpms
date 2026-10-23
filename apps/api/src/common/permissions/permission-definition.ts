/** One permission: a small action a role can allow, e.g. chargers:command. */
export interface PermissionDefinition {
  readonly key: string;
  readonly area: string;
  readonly label: string;
  /** Read-only permissions keep working while a tenant is suspended (story ACC-01). */
  readonly isReadOnly: boolean;
}
