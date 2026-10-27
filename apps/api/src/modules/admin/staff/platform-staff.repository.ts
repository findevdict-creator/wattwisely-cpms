import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, isNull, sql } from 'drizzle-orm';
import { platformStaff, Transaction, userAccounts, UuidV7 } from '@wattwisely/db';
import { PlatformRole } from '../../../common/platform/platform-role-catalog';

/** One Wattwisely staff member with their account. */
export interface StaffRecord {
  id: string;
  userAccountId: string;
  email: string;
  name: string;
  role: PlatformRole;
  grantedAt: Date;
  removedAt: Date | null;
  version: number;
}

/** Reads and writes platform_staff for the admin console (platform access sees every row). */
@Injectable()
export class PlatformStaffRepository {
  /** Current staff, by name (by e-mail for those who never logged in). */
  async findActive(tx: Transaction): Promise<StaffRecord[]> {
    return this.select(tx)
      .where(isNull(platformStaff.removedAt))
      .orderBy(asc(sql`coalesce(nullif(${userAccounts.name}, ''), ${userAccounts.email})`));
  }

  async findById(tx: Transaction, id: string): Promise<StaffRecord | null> {
    const rows = await this.select(tx).where(eq(platformStaff.id, id));
    return rows[0] ?? null;
  }

  /** The row for a person, removed or not: a person has at most one. */
  async findByAccount(tx: Transaction, userAccountId: string): Promise<StaffRecord | null> {
    const rows = await this.select(tx).where(eq(platformStaff.userAccountId, userAccountId));
    return rows[0] ?? null;
  }

  async countActive(tx: Transaction, role?: PlatformRole): Promise<number> {
    const [row] = await tx
      .select({ count: count() })
      .from(platformStaff)
      .where(and(isNull(platformStaff.removedAt), role ? eq(platformStaff.role, role) : undefined));
    return row.count;
  }

  async insert(tx: Transaction, userAccountId: string, role: PlatformRole, grantedBy: string) {
    const id = UuidV7.create();
    await tx.insert(platformStaff).values({ id, userAccountId, role, grantedBy });
    return id;
  }

  /** Applies the change only when the row still has the version the client saw. True when it did. */
  async update(
    tx: Transaction,
    id: string,
    version: number,
    changes: Partial<typeof platformStaff.$inferInsert>,
  ): Promise<boolean> {
    const rows = await tx
      .update(platformStaff)
      .set({ ...changes, version: version + 1, updatedAt: new Date() })
      .where(and(eq(platformStaff.id, id), eq(platformStaff.version, version)))
      .returning({ id: platformStaff.id });
    return rows.length === 1;
  }

  private select(tx: Transaction) {
    return tx
      .select({
        id: platformStaff.id,
        userAccountId: platformStaff.userAccountId,
        email: userAccounts.email,
        name: userAccounts.name,
        role: platformStaff.role,
        grantedAt: platformStaff.createdAt,
        removedAt: platformStaff.removedAt,
        version: platformStaff.version,
      })
      .from(platformStaff)
      .innerJoin(userAccounts, eq(userAccounts.id, platformStaff.userAccountId));
  }
}
