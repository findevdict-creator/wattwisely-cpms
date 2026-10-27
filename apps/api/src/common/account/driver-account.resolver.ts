import { HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { ExpiringCache } from '../cache/expiring-cache';
import { ProblemException } from '../problem/problem.exception';
import { DriverAccount } from './driver-account';
import { DriverAccountsRepository } from './driver-accounts.repository';

/**
 * Finds the driver_accounts row behind a driver app token (module 19), creating or linking it
 * on the first request, as StaffAccountResolver does for staff. Only a verified e-mail address
 * is trusted: an invitation is accepted by matching the address it was sent to, so an
 * unverified one could take over someone else's link.
 */
@Injectable()
export class DriverAccountResolver {
  static readonly CACHE_MS = 60_000;

  private readonly cache = new ExpiringCache<DriverAccount>(DriverAccountResolver.CACHE_MS);

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly accounts: DriverAccountsRepository,
  ) {}

  /** The driver's account; 403 while their e-mail address is unverified. */
  async resolve(user: AuthenticatedUser): Promise<DriverAccount> {
    const cached = this.cache.get(user.keycloakId);
    if (cached) {
      return cached;
    }
    const account = await this.transactionRunner.run(DatabaseSession.anonymous(), (tx) =>
      this.findOrLink(tx, user),
    );
    this.cache.set(user.keycloakId, account);
    return account;
  }

  /** After the driver changed their own profile: the next request reads the row again. */
  forget(keycloakId: string): void {
    this.cache.deleteWhere((key) => key === keycloakId);
  }

  private async findOrLink(tx: Transaction, user: AuthenticatedUser): Promise<DriverAccount> {
    const linked = await this.accounts.findByKeycloakId(tx, user.keycloakId);
    if (linked) {
      return DriverAccountsRepository.toDriverAccount(linked);
    }
    if (!user.isEmailVerified || !user.email) {
      throw new ProblemException(
        HttpStatus.FORBIDDEN,
        'email_unverified',
        'Verify your e-mail address first: open the link in the e-mail you were sent.',
      );
    }
    const byEmail = await this.accounts.findByEmail(tx, user.email);
    if (byEmail?.keycloakId) {
      throw new ProblemException(
        HttpStatus.CONFLICT,
        'account_conflict',
        'This e-mail address belongs to another login. Ask support to fix it.',
      );
    }
    return byEmail ? this.link(tx, user, byEmail) : this.create(tx, user);
  }

  /** A row seeded before the driver ever logged in (demo data, a migration) becomes theirs. */
  private async link(
    tx: Transaction,
    user: AuthenticatedUser,
    row: { id: string; email: string; displayName: string; phone: string | null },
  ): Promise<DriverAccount> {
    await this.accounts.link(tx, row.id, user.keycloakId, user.name);
    return new DriverAccount(row.id, row.email, row.displayName || user.name, row.phone);
  }

  private async create(tx: Transaction, user: AuthenticatedUser): Promise<DriverAccount> {
    const created = await this.accounts.create(tx, {
      keycloakId: user.keycloakId,
      email: user.email as string,
      displayName: user.name,
      phone: null,
    });
    return DriverAccountsRepository.toDriverAccount(created);
  }
}
