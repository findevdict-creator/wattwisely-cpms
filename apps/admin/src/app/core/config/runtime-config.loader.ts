import { RuntimeConfig } from './runtime-config';

/** Downloads /config.json before Angular starts. */
export class RuntimeConfigLoader {
  static readonly URL = '/config.json';

  async load(): Promise<RuntimeConfig> {
    const response = await fetch(RuntimeConfigLoader.URL, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Could not load ${RuntimeConfigLoader.URL} (HTTP ${response.status})`);
    }
    const json = (await response.json()) as Record<string, string>;
    const config = new RuntimeConfig(
      json['apiUrl'],
      json['keycloakUrl'],
      json['keycloakRealm'],
      json['keycloakClientId'],
    );
    config.portalUrl = json['portalUrl'] ?? '';
    return config;
  }
}
