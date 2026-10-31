import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { DriverAccount } from '../../../common/account/driver-account';
import { DriverAccountResolver } from '../../../common/account/driver-account.resolver';
import { DriverAccountsRepository } from '../../../common/account/driver-accounts.repository';
import { RequestAuth } from '../../../common/request/request-auth';
import { DriverDevicesRepository } from '../notifications/driver-devices.repository';
import { DriverAccountEraser } from './driver-account.eraser';
import { DriverMeDto } from './dto/driver-me.dto';
import { UpdateDriverMeRequestDto } from './dto/update-driver-me-request.dto';

/**
 * The driver's own account (module 19): who they are in the app, the two fields they may
 * change, and deleting it (module 33).
 */
@Injectable()
export class DriverMeService {
  private readonly devices = new DriverDevicesRepository();

  constructor(
    private readonly runner: TransactionRunner,
    private readonly accounts: DriverAccountsRepository,
    private readonly resolver: DriverAccountResolver,
    private readonly eraser: DriverAccountEraser,
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

  /**
   * Deletes the account: cards and operator links first, then the phones (module 34), and the
   * row loses the person. The Keycloak login is deleted by the driver in Keycloak itself, which
   * the app opens next.
   */
  async erase(auth: RequestAuth): Promise<void> {
    const account = auth.requireDriver();
    await this.eraser.erase(auth);
    await this.runner.run(DatabaseSession.anonymous(), async (tx) => {
      await this.devices.removeAll(tx, account.id);
      await this.accounts.erase(tx, account.id);
    });
    this.resolver.forget(auth.requireUser().keycloakId);
  }
}
