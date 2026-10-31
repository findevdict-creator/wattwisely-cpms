import { TestBed } from '@angular/core/testing';
import { SecureVault } from '../native/secure-vault';
import { SecureTokenStore } from './secure-token-store';

describe('SecureTokenStore', () => {
  let saved: Map<string, string>;
  let store: SecureTokenStore;

  beforeEach(() => {
    saved = new Map([['refresh_token', 'r-1']]);
    const vault = {
      keys: async () => [...saved.keys()],
      get: async (key: string) => saved.get(key) ?? null,
      set: async (key: string, value: string) => void saved.set(key, value),
      remove: async (key: string) => void saved.delete(key),
    };
    TestBed.configureTestingModule({ providers: [{ provide: SecureVault, useValue: vault }] });
    store = TestBed.inject(SecureTokenStore);
  });

  it('reads what secure storage held when the app last ran', async () => {
    expect(store.getItem('refresh_token')).toBeNull();
    await store.load();
    expect(store.getItem('refresh_token')).toBe('r-1');
  });

  it('answers at once from memory and writes every change through to secure storage', async () => {
    store.setItem('access_token', 'a-1');
    expect(store.getItem('access_token')).toBe('a-1');
    store.removeItem('refresh_token');
    await Promise.resolve();
    expect(saved.get('access_token')).toBe('a-1');
    expect(saved.has('refresh_token')).toBe(false);
  });
});
