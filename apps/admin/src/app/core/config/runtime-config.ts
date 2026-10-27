/**
 * Settings that differ per deployment (URLs, Keycloak client).
 * They are read from /config.json when the console starts, so one built image
 * runs on any server; nothing environment-specific is compiled in.
 */
export class RuntimeConfig {
  /** The tenant portal, linked from the top bar; no link when empty. */
  portalUrl = '';

  constructor(
    readonly apiUrl: string,
    readonly keycloakUrl: string,
    readonly keycloakRealm: string,
    readonly keycloakClientId: string,
  ) {}

  get issuerUrl(): string {
    return `${this.keycloakUrl}/realms/${this.keycloakRealm}`;
  }
}
