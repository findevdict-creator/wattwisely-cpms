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
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) {
        this.entries.delete(key);
      }
    }
  }
}
