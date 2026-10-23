import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { PlatformAccessResolver } from '../../../common/platform/platform-access.resolver';
import { PlatformRole } from '../../../common/platform/platform-role-catalog';
import { PlatformTransaction } from '../../../common/platform/platform-transaction';
import { RequestAuth } from '../../../common/request/request-auth';
import { StaffMemberDto } from './dto/staff-member.dto';
import { PlatformStaffRepository, StaffRecord } from './platform-staff.repository';
import { StaffChange, StaffWriter } from './staff.writer';

/**
 * Wattwisely's own staff and their console roles. Adding someone creates their account if
 * they never logged in, so the role is waiting when they do. There is always one admin left.
 */
@Injectable()
export class AdminStaffService {
  constructor(
    private readonly platform: PlatformTransaction,
    private readonly staff: PlatformStaffRepository,
    private readonly writer: StaffWriter,
    private readonly access: PlatformAccessResolver,
  ) {}

  async list(auth: RequestAuth): Promise<StaffMemberDto[]> {
    const records = await this.platform.run(auth, (tx) => this.staff.findActive(tx));
    return records.map((record) => new StaffMemberDto(record));
  }

  add(auth: RequestAuth, email: string, role: PlatformRole): Promise<StaffMemberDto> {
    return this.change(auth, (tx) => this.writer.add(tx, auth, email, role));
  }

  changeRole(
    auth: RequestAuth,
    id: string,
    version: number,
    role: PlatformRole,
  ): Promise<StaffMemberDto> {
    return this.change(auth, (tx) => this.writer.changeRole(tx, auth, { id, version }, role));
  }

  remove(auth: RequestAuth, id: string, version: number): Promise<StaffMemberDto> {
    return this.change(auth, (tx) => this.writer.remove(tx, auth, { id, version }));
  }

  private async change(
    auth: RequestAuth,
    work: (tx: Transaction) => Promise<StaffChange>,
  ): Promise<StaffMemberDto> {
    const change = await this.platform.run(auth, work);
    this.access.forget(change.after.userAccountId);
    return new StaffMemberDto(change.after as StaffRecord);
  }
}
