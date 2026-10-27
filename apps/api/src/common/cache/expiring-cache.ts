/**
 * A small in-memory cache whose entries expire after a fixed time.
 * Each API instance has its own, so the expiry is also the longest time a
 * change made through another instance can take to be seen here.
 */
export class ExpiringCache<V> {
  private readonly entries = new Map<string, { value: V; expiresAt: number }>();

  constructor(private readonly ttlMs: number) {}

  get(key: string, now: number = Date.now()): V | undefined {
    const entry = this.entries.get(key);
    if (!entry || entry.expiresAt <= now) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V, now: number = Date.now()): void {
    this.entries.set(key, { value, expiresAt: now + this.ttlMs });
  }

  /** Drops every entry whose key starts with `prefix`, e.g. all entries of one person. */
  deleteByPrefix(prefix: string): void {
    this.deleteWhere((key) => key.startsWith(prefix));
  }

  /** Drops every entry whose key ends with `suffix`, e.g. all entries of one tenant. */
  deleteBySuffix(suffix: string): void {
    this.deleteWhere((key) => key.endsWith(suffix));
  }

  /** Drops every entry the predicate picks, by key or by what it holds. */
  deleteWhere(matches: (key: string, value: V) => boolean): void {
    for (const [key, entry] of this.entries) {
      if (matches(key, entry.value)) {
        this.entries.delete(key);
      }
    }
  }
}
