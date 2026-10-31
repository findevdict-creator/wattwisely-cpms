import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { CommandQueuer } from '@wattwisely/payments';
import { SessionStates, SessionStore } from '@wattwisely/session-engine';
import { RequestAuth } from '../../../common/request/request-auth';
import { DriverErrors } from '../../drivers/driver-errors';
import { SessionReadingDto } from '../../sessions/dto/session-reading.dto';
import { SessionReadingPoints } from '../../sessions/session-reading-points';
import { SessionsRepository } from '../../sessions/sessions.repository';
import { ChargeReceiptLookup } from '../../payments/public/charge-receipt.lookup';
import { StopCommandLookup } from '../../payments/public/stop-command.lookup';
import { DriverAppErrors } from '../driver-app-errors';
import { DriverChargeRecord } from './driver-charge-record';
import { DriverChargeStarter } from './driver-charge-starter';
import { DriverChargeCsv } from './driver-charge.csv';
import { DriverChargeTransaction } from './driver-charge.transaction';
import { DriverChargesRepository } from './driver-charges.repository';
import { DriverChargeDetailDto } from './dto/driver-charge-detail.dto';
import { DriverChargeListDto } from './dto/driver-charge-list.dto';
import { StartDriverChargeRequestDto } from './dto/start-driver-charge-request.dto';

/**
 * "My charges" in the driver app (module 19): starting one at a plug, the list across every
 * operator the login is linked with, one charge in full, stopping it, and the CSV.
 */
@Injectable()
export class DriverChargesService {
  /** The newest charges the list shows, across all operators. */
  static readonly LIMIT = 100;

  private readonly sessions = new SessionStore();
  private readonly commands = new CommandQueuer();
  private readonly stops = new StopCommandLookup();
  private readonly receipts = new ChargeReceiptLookup();
  /** The staff pages' readings query, for the driver's own chart (module 32). */
  private readonly sessionsRepository = new SessionsRepository();

  constructor(
    private readonly runner: TransactionRunner,
    private readonly starter: DriverChargeStarter,
    private readonly transaction: DriverChargeTransaction,
    private readonly charges: DriverChargesRepository,
  ) {}

  async start(
    auth: RequestAuth,
    body: StartDriverChargeRequestDto,
  ): Promise<DriverChargeDetailDto> {
    const charger = await this.starter.charger(body.charger_identity);
    return this.runner.run(DatabaseSession.forTenant(charger.tenantId), async (tx) => {
      const started = await this.starter.start(tx, auth, charger, body);
      const record = await this.charges.findById(tx, started.driverId, started.sessionId);
      if (!record) {
        throw DriverAppErrors.chargeNotFound();
      }
      return this.detail(tx, record, started.chargeKey);
    });
  }

  async list(auth: RequestAuth): Promise<DriverChargeListDto> {
    return new DriverChargeListDto(await this.records(auth));
  }

  async export(auth: RequestAuth): Promise<string> {
    return DriverChargeCsv.of(await this.records(auth));
  }

  get(auth: RequestAuth, id: string): Promise<DriverChargeDetailDto> {
    return this.transaction.withCharge(auth, id, (tx, record) => this.detail(tx, record, null));
  }

  /** The power and energy chart of one of the driver's charges, as staff see it (module 32). */
  readings(auth: RequestAuth, id: string): Promise<SessionReadingDto[]> {
    return this.transaction.withCharge(auth, id, async (tx, record) =>
      SessionReadingPoints.of(record, await this.sessionsRepository.findReadings(tx, record.id)),
    );
  }

  /** The driver asks the charger to stop; asking twice queues nothing new. 409 unless it runs. */
  stop(auth: RequestAuth, id: string): Promise<DriverChargeDetailDto> {
    return this.transaction.withCharge(auth, id, async (tx, record) => {
      const session = await this.sessions.find(tx, record.id);
      if (
        !session ||
        !SessionStates.isActive(session.status) ||
        session.ocppTransactionId === null
      ) {
        throw DriverErrors.chargeNotRunning();
      }
      if (!(await this.stops.isPending(tx, session.id))) {
        await this.commands.remoteStop(tx, session, session.ocppTransactionId);
      }
      return this.detail(tx, record, null);
    });
  }

  /** Newest first across operators; each operator contributes at most the list's limit. */
  private async records(auth: RequestAuth): Promise<DriverChargeRecord[]> {
    const perOperator = await this.transaction.forEachOperator(auth, (tx, link) =>
      this.charges.findForDriver(tx, link.driverId, DriverChargesService.LIMIT),
    );
    return perOperator
      .flat()
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, DriverChargesService.LIMIT);
  }

  private async detail(
    tx: Transaction,
    record: DriverChargeRecord,
    chargeKey: string | null,
  ): Promise<DriverChargeDetailDto> {
    return new DriverChargeDetailDto(record, {
      outcome: await this.receipts.of(tx, record.id),
      isStopRequested: await this.stops.isPending(tx, record.id),
      chargeKey,
    });
  }
}
