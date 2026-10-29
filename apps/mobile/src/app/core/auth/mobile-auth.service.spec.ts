import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { RuntimeConfig } from '@wattwisely/driver-core';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';
import { NativeApp } from '../native/native-app';
import { NativeBrowser } from '../native/native-browser';
import { NativePlatform } from '../native/native-platform';
import { MobileAuthService } from './mobile-auth.service';
import { SecureTokenStore } from './secure-token-store';

/** Stands in for angular-oauth2-oidc: a token is valid or not, a refresh token held or not. */
class FakeOAuthService {
  config: AuthConfig = {};
  isTokenValid = false;
  refreshTokenValue: string | null = null;
  loadDiscoveryDocument = jest.fn(async () => ({}));
  tryLoginCodeFlow = jest.fn(async () => {
    this.isTokenValid = true;
    this.refreshTokenValue = 'r-1';
  });
  refreshToken = jest.fn(async () => {
    this.isTokenValid = true;
  });
  logOut = jest.fn(() => {
    this.isTokenValid = false;
    this.refreshTokenValue = null;
  });
  initCodeFlow = jest.fn();
  setupAutomaticSilentRefresh = jest.fn();
  configure(config: AuthConfig): void {
    this.config = config;
  }
  hasValidAccessToken(): boolean {
    return this.isTokenValid;
  }
  getRefreshToken(): string | null {
    return this.refreshTokenValue;
  }
  getAccessToken(): string {
    return this.isTokenValid ? 'a-1' : '';
  }
}

describe('MobileAuthService', () => {
  let oauth: FakeOAuthService;
  let listeners: { url?: (url: string) => void; resume?: () => void };
  let browser: { open: jest.Mock; close: jest.Mock };
  let auth: MobileAuthService;

  beforeEach(() => {
    oauth = new FakeOAuthService();
    listeners = {};
    browser = { open: jest.fn(), close: jest.fn(async () => undefined) };
    TestBed.configureTestingModule({
      providers: [
        { provide: OAuthService, useValue: oauth },
        {
          provide: RuntimeConfig,
          useValue: new RuntimeConfig('https://api.test', 'https://auth.test', 'ww', 'driver'),
        },
        { provide: SecureTokenStore, useValue: { load: async () => undefined } },
        { provide: NativeBrowser, useValue: browser },
        { provide: NativePlatform, useValue: { isNative: () => true } },
        {
          provide: NativeApp,
          useValue: {
            onUrlOpen: (listener: (url: string) => void) => (listeners.url = listener),
            onResume: (listener: () => void) => (listeners.resume = listener),
          },
        },
      ],
    });
    auth = TestBed.inject(MobileAuthService);
  });

  it('starts signed out on a new phone, set up for the system browser', async () => {
    await auth.initialize();
    expect(auth.hasSession()).toBe(false);
    expect(oauth.config.redirectUri).toBe('com.wattwisely.driver:/callback');
    expect(oauth.tryLoginCodeFlow).not.toHaveBeenCalled();
    oauth.config.openUri?.('https://auth.test/login');
    expect(browser.open).toHaveBeenCalledWith('https://auth.test/login');
  });

  it('finishes the sign-in when Keycloak sends the phone back with a code', async () => {
    await auth.initialize();
    listeners.url?.('com.wattwisely.driver:/callback?code=abc&state=xyz');
    await new Promise((resolve) => setTimeout(resolve));
    expect(browser.close).toHaveBeenCalled();
    expect(oauth.tryLoginCodeFlow).toHaveBeenCalledWith({
      customHashFragment: '?code=abc&state=xyz',
      preventClearHashAfterLogin: true,
    });
    expect(auth.hasSession()).toBe(true);
    expect(auth.accessToken()).toBe('a-1');
  });

  it('refreshes an expired token at start-up and when the app comes back', async () => {
    oauth.refreshTokenValue = 'r-1';
    await auth.initialize();
    expect(oauth.refreshToken).toHaveBeenCalledTimes(1);
    oauth.isTokenValid = false;
    listeners.resume?.();
    await new Promise((resolve) => setTimeout(resolve));
    expect(oauth.refreshToken).toHaveBeenCalledTimes(2);
    expect(auth.isLoggedIn()).toBe(true);
  });

  it('signs out here when Keycloak refuses the refresh, but not when the phone is offline', async () => {
    oauth.refreshTokenValue = 'r-1';
    oauth.refreshToken.mockRejectedValueOnce(new HttpErrorResponse({ status: 0 }));
    await auth.initialize();
    expect(auth.hasSession()).toBe(true);
    oauth.refreshToken.mockRejectedValueOnce(new HttpErrorResponse({ status: 400 }));
    listeners.resume?.();
    await new Promise((resolve) => setTimeout(resolve));
    expect(oauth.logOut).toHaveBeenCalledWith(true);
    expect(auth.hasSession()).toBe(false);
  });

  it('opens the app even when Keycloak cannot be reached', async () => {
    oauth.refreshTokenValue = 'r-1';
    oauth.loadDiscoveryDocument.mockRejectedValueOnce(new Error('offline'));
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await auth.initialize();
    expect(auth.hasSession()).toBe(true);
  });

  it('asks Keycloak for its sign-up page for "Create account"', () => {
    auth.login(true);
    expect(oauth.initCodeFlow).toHaveBeenCalledWith('', { prompt: 'create' });
    auth.login();
    expect(oauth.initCodeFlow).toHaveBeenLastCalledWith('', {});
  });

  it('deletes the login in Keycloak after the account, and signs no one in on its answer', async () => {
    oauth.refreshTokenValue = 'r-1';
    await auth.initialize();
    auth.deleteLogin();
    expect(oauth.logOut).toHaveBeenCalledWith(true);
    expect(oauth.initCodeFlow).toHaveBeenCalledWith('', { kc_action: 'delete_account' });
    expect(auth.hasSession()).toBe(false);
    listeners.url?.('com.wattwisely.driver:/callback?kc_action_status=success&state=xyz');
    await new Promise((resolve) => setTimeout(resolve));
    expect(browser.close).toHaveBeenCalled();
    expect(oauth.tryLoginCodeFlow).not.toHaveBeenCalled();
  });

  it("opens Keycloak's account page for the e-mail and the password", () => {
    auth.openAccount();
    expect(browser.open).toHaveBeenCalledWith('https://auth.test/realms/ww/account');
  });
});
