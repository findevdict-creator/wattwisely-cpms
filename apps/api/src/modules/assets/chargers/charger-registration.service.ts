import { Injectable } from '@nestjs/common';
import { UuidV7 } from '../../../common/database/uuid-v7';
import { SitePermissionChecker } from '../../../common/permissions/site-permission.checker';
import { VersionConflict } from '../../../common/problem/version-conflict';
import { RequestAuth } from '../../../common/request/request-auth';
import { AssetErrors } from '../asset-errors';
import { ChargerIdentity } from './charger-identity';
import { ChargerPassword } from './charger-password';
import { ChargerRecord } from './charger-record';
import { ChargerSetupCardBuilder } from './charger-setup-card.builder';
import { ChargerTransaction } from './charger-transaction';
import { ChargersRepository } from './chargers.repository';
import { ChargersService } from './chargers.service';
import { ChargerDto } from './dto/charger.dto';
import { RegisterChargerRequestDto } from './dto/register-charger-request.dto';
import { RegisteredChargerDto } from './dto/registered-charger.dto';

/**
 * Registers chargers and manages how they prove who they are (story AST-02):
 * the identity in the URL, the password (shown once) or the boot fingerprint.
 */
@Injectable()
export class ChargerRegistrationService {
  constructor(
    private readonly transaction: ChargerTransaction,
    private readonly chargers: ChargersRepository,
    private readonly reader: ChargersService,
    private readonly setupCards: ChargerSetupCardBuilder,
  ) {}

  async register(
    auth: RequestAuth,
    request: RegisterChargerRequestDto,
  ): Promise<RegisteredChargerDto> {
    const access = auth.requireAccess();
    const authMode = request.auth_mode ?? 'password';
    const password = authMode === 'password' ? ChargerPassword.generate() : null;
    const id = UuidV7.create();
    const charger = await this.transaction.run(auth, async (tx) => {
      await this.reader.requireSiteForWrite(tx, access, request.site_id);
      await this.chargers.insert(tx, {
        id,
        tenantId: access.tenant.id,
        siteId: request.site_id,
        ocppIdentity: ChargerRegistrationService.identityOf(request),
        vendor: request.vendor?.trim() || null,
        model: request.model?.trim() || null,
        authMode,
        passwordHash: password ? ChargerPassword.hash(password) : null,
        allowPlainWs: request.allow_plain_ws ?? false,
        createdBy: auth.requireAccount().id,
        updatedBy: auth.requireAccount().id,
      });
      const after = (await this.chargers.findById(tx, id)) as ChargerRecord;
      await this.transaction.record(tx, auth, 'chargers.registered', { before: null, after });
      return after;
    });
    return this.answer(auth, charger, password);
  }

  /** Sets a new password (and password mode), shown once in the answer. */
  async setPassword(auth: RequestAuth, id: string, version: number): Promise<RegisteredChargerDto> {
    const password = ChargerPassword.generate();
    const changes = { authMode: 'password' as const, passwordHash: ChargerPassword.hash(password) };
    const charger = await this.change(auth, id, {
      version,
      changes,
      action: 'chargers.password_changed',
    });
    return this.answer(auth, charger, password);
  }

  /** Drops the password: the charger is then recognised by its boot fingerprint. */
  async removePassword(
    auth: RequestAuth,
    id: string,
    version: number,
  ): Promise<RegisteredChargerDto> {
    const changes = { authMode: 'none' as const, passwordHash: null };
    const charger = await this.change(auth, id, {
      version,
      changes,
      action: 'chargers.password_removed',
    });
    return this.answer(auth, charger, null);
  }

  /** Forgets the boot fingerprint, so a replaced charger can claim the identity at its next boot. */
  async resetFingerprint(auth: RequestAuth, id: string, version: number): Promise<ChargerDto> {
    const changes = { bootFingerprint: null };
    await this.change(auth, id, { version, changes, action: 'chargers.fingerprint_reset' });
    return this.reader.get(auth.requireAccess(), id);
  }

  private async change(
    auth: RequestAuth,
    id: string,
    step: { version: number; changes: Parameters<ChargersRepository['update']>[3]; action: string },
  ): Promise<ChargerRecord> {
    const access = auth.requireAccess();
    return this.transaction.run(auth, async (tx) => {
      const before = await this.reader.requireVisible(tx, access, id);
      SitePermissionChecker.requireAt(access, 'chargers:write', before.siteId);
      const row = { ...step.changes, updatedBy: auth.requireAccount().id };
      if (!(await this.chargers.update(tx, id, step.version, row))) {
        throw VersionConflict.exception();
      }
      const after = (await this.chargers.findById(tx, id)) as ChargerRecord;
      await this.transaction.record(tx, auth, step.action, { before, after });
      return after;
    });
  }

  private async answer(
    auth: RequestAuth,
    charger: ChargerRecord,
    password: string | null,
  ): Promise<RegisteredChargerDto> {
    const dto = await this.reader.get(auth.requireAccess(), charger.id);
    return new RegisteredChargerDto(dto, this.setupCards.build(charger, password));
  }

  private static identityOf(request: RegisterChargerRequestDto): string {
    if (request.identity_mode === 'generate') {
      return ChargerIdentity.generate();
    }
    const identity = request.identity?.trim() ?? '';
    if (!ChargerIdentity.isValid(identity)) {
      throw AssetErrors.identityRequired();
    }
    return identity;
  }
}
