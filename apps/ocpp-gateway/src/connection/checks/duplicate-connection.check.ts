import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { OcppVersion } from '@wattwisely/ocpp-contracts';
import { GatewayConfig } from '../../config/gateway.config';
import { ChargerIdentity } from '../../storage/charger-identity';
import { ConnectionRegistry } from '../connection-registry';
import { LeaseKeeper } from '../lease-keeper';
import { UpgradeRefusal } from '../upgrade-refusal';

/**
 * One live socket per charger (check 6). An existing connection on this instance is
 * pinged: if it answers in time the newcomer is refused with 409, otherwise it is dead
 * and the newcomer takes over. A live lease held by another instance also means 409;
 * it runs out by itself if that instance died.
 */
@Injectable()
export class DuplicateConnectionCheck {
  private readonly logger = new Logger(DuplicateConnectionCheck.name);

  constructor(
    private readonly registry: ConnectionRegistry,
    private readonly lease: LeaseKeeper,
    private readonly config: GatewayConfig,
  ) {}

  /** Returns the id of the lease the new connection now holds. */
  async check(
    charger: ChargerIdentity,
    newcomer: { remoteIp: string; version: OcppVersion },
  ): Promise<string> {
    const existing = this.registry.find(charger.id);
    if (existing) {
      if (await existing.ping(this.config.pingTimeoutMs)) {
        this.logger.warn(
          `Duplicate connection refused for ${charger.identity} from ${newcomer.remoteIp}`,
        );
        throw new UpgradeRefusal(409, 'already_connected');
      }
      this.registry.remove(existing);
      await this.lease.release(existing);
      existing.close(1001, 'Replaced by a new connection');
    }
    const connectionId = randomUUID();
    if (!(await this.lease.acquire(charger, { connectionId, ...newcomer }))) {
      throw new UpgradeRefusal(409, 'already_connected');
    }
    return connectionId;
  }
}
