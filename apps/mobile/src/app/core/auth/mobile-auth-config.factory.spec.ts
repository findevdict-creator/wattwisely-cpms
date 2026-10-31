import { RuntimeConfig } from '@wattwisely/driver-core';
import { MobileAuthConfigFactory } from './mobile-auth-config.factory';

describe('MobileAuthConfigFactory', () => {
  const runtimeConfig = new RuntimeConfig(
    'https://api.test',
    'https://auth.test',
    'wattwisely',
    'wattwisely-driver',
  );
  const factory = new MobileAuthConfigFactory();

  it("on a phone, comes back to the app's own address and opens the system browser", () => {
    const openUri = jest.fn();
    const config = factory.create(runtimeConfig, openUri, 'https://localhost');
    expect(config.issuer).toBe('https://auth.test/realms/wattwisely');
    expect(config.clientId).toBe('wattwisely-driver');
    expect(config.responseType).toBe('code');
    expect(config.redirectUri).toBe('com.wattwisely.driver:/callback');
    expect(config.postLogoutRedirectUri).toBe('com.wattwisely.driver:/signed-out');
    expect(config.openUri).toBe(openUri);
    expect(config.requireHttps).toBe(true);
  });

  it('asks for a refresh token that outlives the browser session', () => {
    const config = factory.create(runtimeConfig, null, 'http://localhost:4500');
    expect(config.scope).toContain('offline_access');
  });

  it('in a desktop browser, comes back to the page and leaves the browser to Keycloak', () => {
    const config = factory.create(runtimeConfig, null, 'http://localhost:4500');
    expect(config.redirectUri).toBe('http://localhost:4500/');
    expect(config.openUri).toBeUndefined();
  });
});
