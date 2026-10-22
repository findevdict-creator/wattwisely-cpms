import { HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { ExpiringCache } from '../cache/expiring-cache';
import { ProblemException } from '../problem/problem.exception';
import { StaffAccount } from './staff-account';
import { UserAccountsRepository } from './user-accounts.repository';

/**
 * Finds the caller's user_accounts row from their Keycloak id, creating or linking it
 * on their first request. Only e-mail addresses Keycloak has verified are trusted:
 * otherwise anyone could sign up with a colleague's address and take over their invitation.
 */
@Injectable()
export class StaffAccountResolver {
  static readonly CACHE_MS = 60_000;

  private readonly cache = new ExpiringCache<StaffAccount>(StaffAccountResolver.CACHE_MS);

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly accounts: UserAccountsRepository,
  ) {}

  /** The caller's account, or null while their e-mail address is unverified. */
  async resolve(user: AuthenticatedUser): Promise<StaffAccount | null> {
    const cached = this.cache.get(user.keycloakId);
    if (cached) {
      return cached;
    }
    const account = await this.transactionRunner.run(DatabaseSession.anonymous(), (tx) =>
      this.findOrLink(tx, user),
    );
    if (account) {
      this.cache.set(user.keycloakId, account);
    }
    return account;
  }

  private async findOrLink(tx: Transaction, user: AuthenticatedUser): Promise<StaffAccount | null> {
    const linked = await this.accounts.findByKeycloakId(tx, user.keycloakId);
    if (linked) {
      return UserAccountsRepository.toStaffAccount(linked);
    }
    if (!user.isEmailVerified || !user.email) {
      return null;
    }
    const byEmail = await this.accounts.findByEmail(tx, user.email);
    if (byEmail?.keycloakId) {
      throw new ProblemException(
        HttpStatus.CONFLICT,
        'account_conflict',
        'This e-mail address belongs to another login. Ask support to fix it.',
      );
    }
    if (byEmail) {
      await this.accounts.link(tx, byEmail.id, user.keycloakId, user.name);
      return new StaffAccount(byEmail.id, byEmail.email, byEmail.name || user.name);
    }
    const created = await this.accounts.create(tx, {
      keycloakId: user.keycloakId,
      email: user.email,
      name: user.name,
    });
    return UserAccountsRepository.toStaffAccount(created);
  }
}
