/**
 * One tenant the user belongs to. A tenant is a Keycloak organization;
 * `id` is the organization id and `alias` its short name (e.g. "acme-charging").
 */
export class TenantMembership {
  constructor(
    readonly id: string,
    readonly alias: string,
  ) {}
}
