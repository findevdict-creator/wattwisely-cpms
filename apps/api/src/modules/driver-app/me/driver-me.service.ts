import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { DriverAccount } from '../../../common/account/driver-account';
import { DriverAccountResolver } from '../../../common/account/driver-account.resolver';
import { DriverAccountsRepository } from '../../../common/account/driver-accounts.repository';
import { RequestAuth } from '../../../common/request/request-auth';
import { DriverMeDto } from './dto/driver-me.dto';
import { UpdateDriverMeRequestDto } from './dto/update-driver-me-request.dto';

/** The driver's own account (module 19): who they are in the app, and the two fields they may change. */
@Injectable()
export class DriverMeService {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly accounts: DriverAccountsRepository,
    private readonly resolver: DriverAccountResolver,
  ) {}

  describe(auth: RequestAuth): DriverMeDto {
    return new DriverMeDto(auth.requireDriver());
  }

  async update(auth: RequestAuth, request: UpdateDriverMeRequestDto): Promise<DriverMeDto> {
    const account = auth.requireDriver();
    const changes = {
      displayName: request.display_name?.trim(),
      phone: request.phone === undefined ? undefined : request.phone?.trim() || null,
    };
    await this.runner.run(DatabaseSession.anonymous(), (tx) =>
      this.accounts.updateProfile(tx, account.id, changes),
    );
    this.resolver.forget(auth.requireUser().keycloakId);
    return new DriverMeDto(
      new DriverAccount(
        account.id,
        account.email,
        changes.displayName ?? account.displayName,
        changes.phone === undefined ? account.phone : changes.phone,
      ),
    );
  }
}
