import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { OcppVersion } from '@wattwisely/ocpp-contracts';
import { GatewayConfig } from '../config/gateway.config';
import { ChargerIdentity } from '../storage/charger-identity';
import { ConnectionsRepository } from '../storage/connections.repository';
import { ChargerConnection } from './charger-connection';
import { ConnectionRegistry } from './connection-registry';

/**
 * Keeps the charger_connections leases of this instance: takes one when a charger
 * connects, renews them all every watch interval, drops one when the socket closes.
 * A charger is online for the API exactly while its lease is live.
 */
@Injectable()
export class LeaseKeeper implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LeaseKeeper.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly connections: ConnectionsRepository,
    private readonly registry: ConnectionRegistry,
    private readonly config: GatewayConfig,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.refreshAll(), this.config.watchIntervalMs);
    this.timer.unref();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
    }
    await Promise.all(this.registry.all().map((connection) => this.release(connection)));
  }

  acquire(
    charger: ChargerIdentity,
    socket: { connectionId: string; remoteIp: string; version: OcppVersion },
  ): Promise<boolean> {
    return this.transactionRunner.run(DatabaseSession.forTenant(charger.tenantId), (tx) =>
      this.connections.acquire(tx, {
        chargerId: charger.id,
        tenantId: charger.tenantId,
        instanceId: this.config.instanceId,
        connectionId: socket.connectionId,
        remoteIp: socket.remoteIp,
        ocppVersion: socket.version,
        leaseSeconds: this.config.leaseSeconds,
      }),
    );
  }

  markBooted(connection: ChargerConnection): Promise<void> {
    return this.transactionRunner.run(
      DatabaseSession.forTenant(connection.charger.tenantId),
      (tx) => this.connections.markBooted(tx, connection.charger.id, connection.connectionId),
    );
  }

  async release(connection: ChargerConnection): Promise<void> {
    try {
      await this.transactionRunner.run(
        DatabaseSession.forTenant(connection.charger.tenantId),
        (tx) => this.connections.release(tx, connection.charger.id, connection.connectionId),
      );
    } catch (error) {
      this.logger.warn(
        `Could not release the lease of ${connection.charger.identity}: ${(error as Error).message}`,
      );
    }
  }

  /** One update per tenant, because row-level security scopes each transaction to a tenant. */
  async refreshAll(): Promise<void> {
    const byTenant = new Map<string, string[]>();
    for (const connection of this.registry.all()) {
      const ids = byTenant.get(connection.charger.tenantId) ?? [];
      byTenant.set(connection.charger.tenantId, [...ids, connection.charger.id]);
    }
    for (const [tenantId, chargerIds] of byTenant) {
      try {
        await this.transactionRunner.run(DatabaseSession.forTenant(tenantId), (tx) =>
          this.connections.refresh(
            tx,
            this.config.instanceId,
            chargerIds,
            this.config.leaseSeconds,
          ),
        );
      } catch (error) {
        this.logger.warn(`Could not renew leases: ${(error as Error).message}`);
      }
    }
  }
}
