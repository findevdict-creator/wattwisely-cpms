import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { platformStaff, Transaction } from '@wattwisely/db';
import { PlatformAccess } from './platform-access';

/** Reads a person's platform_staff row: whether they are Wattwisely staff, and in which role. */
@Injectable()
export class PlatformAccessRepository {
  async findActive(tx: Transaction, userAccountId: string): Promise<PlatformAccess | null> {
    const rows = await tx
      .select({ id: platformStaff.id, role: platformStaff.role })
      .from(platformStaff)
      .where(and(eq(platformStaff.userAccountId, userAccountId), isNull(platformStaff.removedAt)));
    return rows[0] ? new PlatformAccess(rows[0].id, rows[0].role) : null;
  }
}
