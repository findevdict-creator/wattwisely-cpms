import { HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { StaffAccount } from '../account/staff-account';
import { ExpiringCache } from '../cache/expiring-cache';
import { ProblemException } from '../problem/problem.exception';
import { PlatformAccess } from './platform-access';
import { PlatformAccessRepository } from './platform-access.repository';

/**
 * Whether the caller is Wattwisely staff (module 9). The database is the source of truth:
 * a platform_staff row, not a token claim, so adding or removing someone takes effect
 * within the cache time (30 seconds, at once on the instance that made the change).
 * Having no row is the normal case and is cached too, as "not staff".
 */
@Injectable()
export class PlatformAccessResolver {
  static readonly CACHE_MS = 30_000;

  private readonly cache = new ExpiringCache<PlatformAccess | null>(
    PlatformAccessResolver.CACHE_MS,
  );

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly repository: PlatformAccessRepository,
  ) {}

  async resolve(account: StaffAccount): Promise<PlatformAccess | null> {
    const cached = this.cache.get(account.id);
    if (cached !== undefined) {
      return cached;
    }
    const access = await this.transactionRunner.run(DatabaseSession.forUser(account.id), (tx) =>
      this.repository.findActive(tx, account.id),
    );
    this.cache.set(account.id, access);
    return access;
  }

  /** After a staff member is added, changed or removed. */
  forget(userAccountId: string): void {
    this.cache.deleteByPrefix(userAccountId);
  }

  static require(access: PlatformAccess | null): PlatformAccess {
    if (!access) {
      throw new ProblemException(
        HttpStatus.FORBIDDEN,
        'not_platform_staff',
        'Only Wattwisely staff can use the admin console.',
      );
    }
    return access;
  }
}
