import { Injectable } from '@nestjs/common';
import {
  DatabaseErrors,
  DatabaseSession,
  Transaction,
  TransactionRunner,
  UuidV7,
} from '@wattwisely/db';
import { AuditRecorder } from '../../../common/audit/audit.recorder';
import { SitePermissionChecker } from '../../../common/permissions/site-permission.checker';
import { VersionConflict } from '../../../common/problem/version-conflict';
import { RequestAuth } from '../../../common/request/request-auth';
import { DriverErrors } from '../driver-errors';
import { DriversService } from '../profiles/drivers.service';
import { AddCardRequestDto } from './dto/add-card-request.dto';
import { RfidCardDto } from './dto/rfid-card.dto';
import { UpdateCardRequestDto } from './dto/update-card-request.dto';
import { RfidCardRecord } from './rfid-card-record';
import { RfidCardsRepository } from './rfid-cards.repository';

/** Registers a driver's RFID cards and changes their state (story DRV-03), each with an audit entry. */
@Injectable()
export class RfidCardsService {
  static readonly TAG_INDEX = 'rfid_cards_tag_unique';

  constructor(
    private readonly runner: TransactionRunner,
    private readonly cards: RfidCardsRepository,
    private readonly drivers: DriversService,
    private readonly audit: AuditRecorder,
  ) {}

  async add(auth: RequestAuth, driverId: string, request: AddCardRequestDto): Promise<RfidCardDto> {
    const access = auth.requireAccess();
    SitePermissionChecker.requireWholeTenant(access, 'drivers:write');
    const id = UuidV7.create();
    return this.run(async (tx) => {
      const driver = await this.drivers.requireVisible(tx, driverId);
      await this.cards.insert(tx, {
        id,
        tenantId: access.tenant.id,
        driverId: driver.id,
        idTag: request.id_tag.trim(),
        label: request.label?.trim() ?? '',
        paymentMode: request.payment_mode,
        expiresAt: request.expires_at ? new Date(request.expires_at) : null,
        createdBy: auth.requireAccount().id,
      });
      const card = (await this.cards.findById(tx, id)) as RfidCardRecord;
      await this.record(tx, auth, 'rfid_cards.added', { before: null, after: card });
      return new RfidCardDto(card);
    }, access);
  }

  async update(
    auth: RequestAuth,
    ids: { driverId: string; cardId: string },
    version: number,
    request: UpdateCardRequestDto,
  ): Promise<RfidCardDto> {
    const access = auth.requireAccess();
    SitePermissionChecker.requireWholeTenant(access, 'drivers:write');
    return this.run(async (tx) => {
      const before = await this.requireCard(tx, ids);
      const changes = {
        label: request.label?.trim(),
        status: request.status,
        paymentMode: request.payment_mode,
        expiresAt: RfidCardsService.expiryOf(request),
      };
      if (!(await this.cards.update(tx, before.id, version, changes))) {
        throw VersionConflict.exception();
      }
      const after = (await this.cards.findById(tx, before.id)) as RfidCardRecord;
      await this.record(tx, auth, 'rfid_cards.updated', { before, after });
      return new RfidCardDto(after);
    }, access);
  }

  /** 404 for a card that does not exist or belongs to another driver. */
  private async requireCard(tx: Transaction, ids: { driverId: string; cardId: string }) {
    const driver = await this.drivers.requireVisible(tx, ids.driverId);
    const card = UuidV7.isUuid(ids.cardId) ? await this.cards.findById(tx, ids.cardId) : null;
    if (!card || card.driverId !== driver.id) {
      throw DriverErrors.cardNotFound();
    }
    return card;
  }

  /** Left out: unchanged. Null: cleared. A date: set. */
  private static expiryOf(request: UpdateCardRequestDto): Date | null | undefined {
    if (request.expires_at === undefined) {
      return undefined;
    }
    return request.expires_at ? new Date(request.expires_at) : null;
  }

  private async run<T>(
    work: (tx: Transaction) => Promise<T>,
    access: { tenant: { id: string } },
  ): Promise<T> {
    try {
      return await this.runner.run(DatabaseSession.forTenant(access.tenant.id), work);
    } catch (error) {
      if (DatabaseErrors.violatedUniqueConstraint(error) === RfidCardsService.TAG_INDEX) {
        throw DriverErrors.cardTagTaken();
      }
      throw error;
    }
  }

  private record(
    tx: Transaction,
    auth: RequestAuth,
    action: string,
    change: { before: RfidCardRecord | null; after: RfidCardRecord | null },
  ): Promise<void> {
    const card = (change.after ?? change.before) as RfidCardRecord;
    const snapshot = (record: RfidCardRecord | null) =>
      record && {
        label: record.label,
        status: record.status,
        payment_mode: record.paymentMode,
        expires_at: record.expiresAt,
      };
    return this.audit.record(tx, auth, {
      action,
      targetType: 'rfid_card',
      targetId: card.id,
      targetLabel: card.idTag,
      before: snapshot(change.before),
      after: snapshot(change.after),
    });
  }
}
