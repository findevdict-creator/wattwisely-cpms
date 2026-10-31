/**
 * Settings that differ per deployment (URLs, Keycloak client).
 * They are read from /config.json when the portal starts, so one built image
 * runs on any server; nothing environment-specific is compiled in.
 */
export class RuntimeConfig {
  /** Where Wattwisely staff find the admin console; empty when it is not deployed. */
  adminUrl = '';
  /** Where the top bar's help button leads, such as a help centre; no button when empty. */
  helpUrl = '';

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
