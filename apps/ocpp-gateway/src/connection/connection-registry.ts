import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ChargerConnection } from './charger-connection';

/** The open sockets of this instance, by charger id. Closes them all with 1012 (service restart) on shutdown. */
@Injectable()
export class ConnectionRegistry implements OnModuleDestroy {
  static readonly SERVICE_RESTART = 1012;

  private readonly connections = new Map<string, ChargerConnection>();

  get size(): number {
    return this.connections.size;
  }

  all(): ChargerConnection[] {
    return [...this.connections.values()];
  }

  find(chargerId: string): ChargerConnection | null {
    return this.connections.get(chargerId) ?? null;
  }

  add(connection: ChargerConnection): void {
    this.connections.set(connection.charger.id, connection);
  }

  /** True when this very connection was the registered one (and not already replaced). */
  remove(connection: ChargerConnection): boolean {
    if (this.connections.get(connection.charger.id) !== connection) {
      return false;
    }
    this.connections.delete(connection.charger.id);
    return true;
  }

  onModuleDestroy(): void {
    for (const connection of this.connections.values()) {
      connection.close(ConnectionRegistry.SERVICE_RESTART, 'Gateway restarting');
    }
  }
}
