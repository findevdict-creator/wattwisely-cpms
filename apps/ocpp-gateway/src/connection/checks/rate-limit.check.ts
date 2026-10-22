import { Injectable } from '@nestjs/common';
import { GatewayConfig } from '../../config/gateway.config';
import { UpgradeRefusal } from '../upgrade-refusal';
import { UpgradeRequest } from '../upgrade-request';

/**
 * At most N upgrade attempts per charger identity and per client address, per minute,
 * counted in this process (OCPP gateway design, check 2). Unknown identities count too,
 * so guessing identities is slow.
 */
@Injectable()
export class RateLimitCheck {
  static readonly WINDOW_MS = 60_000;
  static readonly SWEEP_EVERY = 1_000;

  private readonly attempts = new Map<string, number[]>();
  private checksSinceSweep = 0;

  constructor(private readonly config: GatewayConfig) {}

  check(request: UpgradeRequest): void {
    const now = Date.now();
    const byCharger = this.count(`id:${request.identity.toLowerCase()}`, now);
    const byIp = this.count(`ip:${request.ip}`, now);
    this.sweepSometimes(now);
    if (byCharger > this.config.rateLimitPerCharger || byIp > this.config.rateLimitPerIp) {
      throw new UpgradeRefusal(429, 'too_many_attempts', { 'retry-after': '60' });
    }
  }

  /** Records this attempt and returns how many fell in the last minute, this one included. */
  private count(key: string, now: number): number {
    const recent = (this.attempts.get(key) ?? []).filter(
      (at) => now - at < RateLimitCheck.WINDOW_MS,
    );
    recent.push(now);
    this.attempts.set(key, recent);
    return recent.length;
  }

  /** Forgets keys with nothing recent, so the map does not grow forever. */
  private sweepSometimes(now: number): void {
    this.checksSinceSweep += 1;
    if (this.checksSinceSweep < RateLimitCheck.SWEEP_EVERY) {
      return;
    }
    this.checksSinceSweep = 0;
    for (const [key, times] of this.attempts) {
      if (times.every((at) => now - at >= RateLimitCheck.WINDOW_MS)) {
        this.attempts.delete(key);
      }
    }
  }
}
