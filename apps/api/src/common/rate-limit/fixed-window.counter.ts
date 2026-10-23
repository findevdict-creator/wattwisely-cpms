/** What a hit on the counter found. */
export interface WindowHit {
  isAllowed: boolean;
  /** Seconds until the window starts over. */
  retryAfterSeconds: number;
}

/**
 * Counts hits per key in one-minute windows, in this process's memory. One API process
 * runs per server today; several replicas would each count their own share, so the limit
 * is per replica until the counts move to Valkey.
 */
export class FixedWindowCounter {
  static readonly WINDOW_MS = 60_000;
  static readonly SWEEP_EVERY = 10_000;

  private readonly windows = new Map<string, { startedAt: number; hits: number }>();
  private hitsSinceSweep = 0;

  hit(key: string, limit: number, now: number): WindowHit {
    this.sweepSometimes(now);
    let window = this.windows.get(key);
    if (!window || now - window.startedAt >= FixedWindowCounter.WINDOW_MS) {
      window = { startedAt: now, hits: 0 };
      this.windows.set(key, window);
    }
    window.hits += 1;
    const resetsInMs = window.startedAt + FixedWindowCounter.WINDOW_MS - now;
    return {
      isAllowed: window.hits <= limit,
      retryAfterSeconds: Math.max(1, Math.ceil(resetsInMs / 1000)),
    };
  }

  /** How many keys are counted right now (tests read it). */
  get size(): number {
    return this.windows.size;
  }

  /** Forgets finished windows now and then, so the map does not grow forever. */
  private sweepSometimes(now: number): void {
    this.hitsSinceSweep += 1;
    if (this.hitsSinceSweep < FixedWindowCounter.SWEEP_EVERY) {
      return;
    }
    this.hitsSinceSweep = 0;
    for (const [key, window] of this.windows) {
      if (now - window.startedAt >= FixedWindowCounter.WINDOW_MS) {
        this.windows.delete(key);
      }
    }
  }
}
