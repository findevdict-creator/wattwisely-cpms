import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { userAccounts } from '@wattwisely/db';
import { Transaction } from '../database/transaction-runner';
import { UuidV7 } from '../database/uuid-v7';
import { StaffAccount } from './staff-account';

/** A user_accounts row as this repository returns it. */
export interface UserAccountRow {
  id: string;
  keycloakId: string | null;
  email: string;
  name: string;
}

/** Reads and writes user_accounts, the global list of staff identities. */
@Injectable()
export class UserAccountsRepository {
  async findByKeycloakId(tx: Transaction, keycloakId: string): Promise<UserAccountRow | null> {
    const rows = await this.select(tx).where(eq(userAccounts.keycloakId, keycloakId));
    return rows[0] ?? null;
  }

  async findByEmail(tx: Transaction, email: string): Promise<UserAccountRow | null> {
    const rows = await this.select(tx).where(
      eq(sql`lower(${userAccounts.email})`, email.toLowerCase()),
    );
    return rows[0] ?? null;
  }

  /** Connects an invited (or seeded) person to their Keycloak login on first sign-in. */
  async link(tx: Transaction, id: string, keycloakId: string, name: string): Promise<void> {
    await tx
      .update(userAccounts)
      .set({ keycloakId, name: sql`coalesce(nullif(${userAccounts.name}, ''), ${name})` })
      .where(eq(userAccounts.id, id));
  }

  async create(tx: Transaction, row: Omit<UserAccountRow, 'id'>): Promise<UserAccountRow> {
    const created = { id: UuidV7.create(), ...row };
    await tx.insert(userAccounts).values(created);
    return created;
  }

  /** The account for an invited e-mail address, created without a login if the person is new. */
  async findOrCreateByEmail(tx: Transaction, email: string): Promise<UserAccountRow> {
    const existing = await this.findByEmail(tx, email);
    return existing ?? this.create(tx, { keycloakId: null, email, name: '' });
  }

  static toStaffAccount(row: UserAccountRow): StaffAccount {
    return new StaffAccount(row.id, row.email, row.name);
  }

  private select(tx: Transaction) {
    return tx
      .select({
        id: userAccounts.id,
        keycloakId: userAccounts.keycloakId,
        email: userAccounts.email,
        name: userAccounts.name,
      })
      .from(userAccounts);
  }
}
