/**
 * Settings that differ per deployment (URLs, Keycloak client). They are read from
 * /config.json when the app starts. The driver web app's container writes that file, so one
 * built image runs on any server; the mobile app carries one per environment in its bundle.
 */
export class RuntimeConfig {
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
