import { Injectable } from '@nestjs/common';
import { and, asc, eq, ilike, inArray, ne, or, SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { membershipRoles, roles, tenantMemberships, userAccounts } from '@wattwisely/db';
import { Transaction } from '../../common/database/transaction-runner';
import { MemberGrant, MemberRecord } from './member-record';

/** Filters for the members list. Without a status, removed members are left out. */
export interface MemberFilter {
  status?: MemberRecord['status'];
  roleId?: string;
  q?: string;
}

/** Reads tenant memberships with their people and roles. RLS limits every query to the current tenant. */
@Injectable()
export class MembersRepository {
  private readonly inviter = alias(userAccounts, 'inviter');

  async findAll(tx: Transaction, filter: MemberFilter = {}): Promise<MemberRecord[]> {
    const rows = await this.select(tx)
      .where(and(...this.conditions(tx, filter)))
      .orderBy(asc(userAccounts.name), asc(userAccounts.email));
    return this.withGrants(tx, rows);
  }

  async findById(tx: Transaction, id: string): Promise<MemberRecord | null> {
    const rows = await this.select(tx).where(eq(tenantMemberships.id, id));
    return (await this.withGrants(tx, rows))[0] ?? null;
  }

  async findByAccount(tx: Transaction, userAccountId: string): Promise<MemberRecord | null> {
    const rows = await this.select(tx).where(eq(tenantMemberships.userAccountId, userAccountId));
    return (await this.withGrants(tx, rows))[0] ?? null;
  }

  private conditions(tx: Transaction, filter: MemberFilter): (SQL | undefined)[] {
    const search = filter.q ? `%${filter.q.replace(/[%_\\]/g, '\\$&')}%` : undefined;
    const withRole = filter.roleId
      ? tx
          .select({ id: membershipRoles.membershipId })
          .from(membershipRoles)
          .where(eq(membershipRoles.roleId, filter.roleId))
      : undefined;
    return [
      filter.status
        ? eq(tenantMemberships.status, filter.status)
        : ne(tenantMemberships.status, 'removed'),
      search ? or(ilike(userAccounts.name, search), ilike(userAccounts.email, search)) : undefined,
      withRole ? inArray(tenantMemberships.id, withRole) : undefined,
    ];
  }

  private select(tx: Transaction) {
    return tx
      .select({
        id: tenantMemberships.id,
        userAccountId: tenantMemberships.userAccountId,
        email: userAccounts.email,
        name: userAccounts.name,
        status: tenantMemberships.status,
        invitedAt: tenantMemberships.invitedAt,
        inviteExpiresAt: tenantMemberships.inviteExpiresAt,
        joinedAt: tenantMemberships.joinedAt,
        removedAt: tenantMemberships.removedAt,
        invitedByName: this.inviter.name,
      })
      .from(tenantMemberships)
      .innerJoin(userAccounts, eq(userAccounts.id, tenantMemberships.userAccountId))
      .leftJoin(this.inviter, eq(this.inviter.id, tenantMemberships.invitedBy));
  }

  private async withGrants(
    tx: Transaction,
    rows: Omit<MemberRecord, 'grants'>[],
  ): Promise<MemberRecord[]> {
    const grants = await this.findGrants(
      tx,
      rows.map((row) => row.id),
    );
    return rows.map((row) => ({ ...row, grants: grants.get(row.id) ?? [] }));
  }

  private async findGrants(tx: Transaction, ids: string[]): Promise<Map<string, MemberGrant[]>> {
    const grants = new Map<string, MemberGrant[]>();
    if (ids.length === 0) {
      return grants;
    }
    const rows = await tx
      .select({
        membershipId: membershipRoles.membershipId,
        roleId: roles.id,
        roleKey: roles.key,
        roleName: roles.name,
        siteId: membershipRoles.siteId,
      })
      .from(membershipRoles)
      .innerJoin(roles, eq(roles.id, membershipRoles.roleId))
      .where(inArray(membershipRoles.membershipId, ids))
      .orderBy(asc(roles.createdAt), asc(membershipRoles.siteId));
    for (const { membershipId, ...grant } of rows) {
      grants.set(membershipId, [...(grants.get(membershipId) ?? []), grant]);
    }
    return grants;
  }
}
