import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { TenantAccess } from '../../common/tenant/tenant-access';
import { ListMembersQueryDto } from './dto/list-members-query.dto';
import { MemberDto } from './dto/member.dto';
import { MembersRepository } from './members.repository';
import { TeamErrors } from './team-errors';

/** Lists team members and invitations. Teams are small, so the list is not paged. */
@Injectable()
export class MembersService {
  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly members: MembersRepository,
  ) {}

  async list(access: TenantAccess, query: ListMembersQueryDto): Promise<MemberDto[]> {
    const records = await this.transactionRunner.run(
      DatabaseSession.forTenant(access.tenant.id),
      (tx) => this.members.findAll(tx, { status: query.status, roleId: query.role_id, q: query.q }),
    );
    return records.map((record) => new MemberDto(record));
  }

  async get(access: TenantAccess, memberId: string): Promise<MemberDto> {
    const record = await this.transactionRunner.run(
      DatabaseSession.forTenant(access.tenant.id),
      (tx) => this.members.findById(tx, memberId),
    );
    if (!record) {
      throw TeamErrors.memberNotFound();
    }
    return new MemberDto(record);
  }
}
