import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { driverAccounts, Transaction, UuidV7 } from '@wattwisely/db';
import { DriverAccount } from './driver-account';

/** A driver_accounts row as this repository returns it. */
export interface DriverAccountRow {
  id: string;
  keycloakId: string | null;
  email: string;
  displayName: string;
  phone: string | null;
}

/** Reads and writes driver_accounts, the global list of drivers' own logins (module 19). */
@Injectable()
export class DriverAccountsRepository {
  async findByKeycloakId(tx: Transaction, keycloakId: string): Promise<DriverAccountRow | null> {
    const rows = await this.select(tx).where(eq(driverAccounts.keycloakId, keycloakId));
    return rows[0] ?? null;
  }

  async findByEmail(tx: Transaction, email: string): Promise<DriverAccountRow | null> {
    const rows = await this.select(tx).where(
      eq(sql`lower(${driverAccounts.email})`, email.toLowerCase()),
    );
    return rows[0] ?? null;
  }

  /** Connects a seeded account to its Keycloak login at the first sign-in. */
  async link(tx: Transaction, id: string, keycloakId: string, displayName: string): Promise<void> {
    await tx
      .update(driverAccounts)
      .set({
        keycloakId,
        displayName: sql`coalesce(nullif(${driverAccounts.displayName}, ''), ${displayName})`,
        lastSeenAt: new Date(),
      })
      .where(eq(driverAccounts.id, id));
  }

  async create(tx: Transaction, row: Omit<DriverAccountRow, 'id'>): Promise<DriverAccountRow> {
    const created = { id: UuidV7.create(), ...row };
    await tx.insert(driverAccounts).values({ ...created, lastSeenAt: new Date() });
    return created;
  }

  /** What the driver may change about themselves: the name they go by and their phone. */
  async updateProfile(
    tx: Transaction,
    id: string,
    changes: { displayName?: string; phone?: string | null },
  ): Promise<void> {
    await tx.update(driverAccounts).set(changes).where(eq(driverAccounts.id, id));
  }

  /**
   * The driver deleted their account (module 33): the row stays for the removed cards that point
   * at it, without the person. The Keycloak id and e-mail go, so a later login starts afresh.
   */
  async erase(tx: Transaction, id: string): Promise<void> {
    await tx
      .update(driverAccounts)
      .set({
        keycloakId: null,
        email: `deleted-${id}@deleted.invalid`,
        displayName: '',
        phone: null,
        paymentCustomerId: null,
        updatedAt: new Date(),
      })
      .where(eq(driverAccounts.id, id));
  }

  static toDriverAccount(row: DriverAccountRow): DriverAccount {
    return new DriverAccount(row.id, row.email, row.displayName, row.phone);
  }

  private select(tx: Transaction) {
    return tx
      .select({
        id: driverAccounts.id,
        keycloakId: driverAccounts.keycloakId,
        email: driverAccounts.email,
        displayName: driverAccounts.displayName,
        phone: driverAccounts.phone,
      })
      .from(driverAccounts);
  }
}
