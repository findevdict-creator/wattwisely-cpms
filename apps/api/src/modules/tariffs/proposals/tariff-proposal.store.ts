import { Injectable } from '@nestjs/common';
import { Transaction, UuidV7 } from '@wattwisely/db';
import { AuditRecorder } from '../../../common/audit/audit.recorder';
import { RequestAuth } from '../../../common/request/request-auth';
import { TariffRecord } from '../tariff-record';
import { TariffsService } from '../tariffs.service';
import { CreateTariffProposalRequestDto } from './dto/create-tariff-proposal-request.dto';
import { TariffProposalErrors } from './tariff-proposal-errors';
import { TariffProposalRecord, TariffProposalRow } from './tariff-proposal-record';
import { TariffProposalsRepository } from './tariff-proposals.repository';

/** What a proposal is about: an existing tariff, or a new one by name and currency. */
export interface ProposalTarget {
  tariffId: string | null;
  name: string;
  currency: string;
}

/** Reads, writes and records tariff proposals inside the caller's transaction. */
@Injectable()
export class TariffProposalStore {
  constructor(
    private readonly proposals: TariffProposalsRepository,
    private readonly tariffs: TariffsService,
    private readonly audit: AuditRecorder,
  ) {}

  list(tx: Transaction, status?: TariffProposalRow['status']): Promise<TariffProposalRecord[]> {
    return this.proposals.findAll(tx, status);
  }

  /** The proposal, or 404. */
  async require(tx: Transaction, id: string): Promise<TariffProposalRecord> {
    const record = UuidV7.isUuid(id) ? await this.proposals.findById(tx, id) : null;
    if (!record) {
      throw TariffProposalErrors.notFound();
    }
    return record;
  }

  /** The proposal while it is still open, or 404 / 409. */
  async requireOpen(tx: Transaction, id: string): Promise<TariffProposalRecord> {
    const record = await this.require(tx, id);
    if (record.status !== 'proposed') {
      throw TariffProposalErrors.decided();
    }
    return record;
  }

  /** The tariff a proposal changes, or 404. */
  requireTariff(tx: Transaction, id: string): Promise<TariffRecord> {
    return this.tariffs.require(tx, id);
  }

  /** What the proposal is for: an existing tariff, or a new one with a name and currency. */
  async targetOf(
    tx: Transaction,
    request: CreateTariffProposalRequestDto,
  ): Promise<ProposalTarget> {
    if (request.tariff_id) {
      const tariff = await this.tariffs.require(tx, request.tariff_id);
      return { tariffId: tariff.id, name: tariff.name, currency: tariff.currency };
    }
    if (!request.name?.trim() || !request.currency) {
      throw TariffProposalErrors.nameRequired();
    }
    return { tariffId: null, name: request.name.trim(), currency: request.currency };
  }

  async insert(tx: Transaction, auth: RequestAuth, request: CreateTariffProposalRequestDto) {
    const target = await this.targetOf(tx, request);
    const id = UuidV7.create();
    await this.proposals.insert(tx, {
      id,
      tenantId: auth.requireAccess().tenant.id,
      ...target,
      prices: request.prices,
      note: request.note?.trim() ?? '',
      proposedBy: auth.requireAccount().id,
    });
    return this.require(tx, id);
  }

  /** Moves the proposal to its end state, if it still has the version the caller saw (else 409). */
  async close(
    tx: Transaction,
    proposal: TariffProposalRecord,
    version: number,
    changes: Partial<TariffProposalRow> & { status: TariffProposalRow['status'] },
  ): Promise<TariffProposalRecord> {
    if (!(await this.proposals.update(tx, proposal.id, version, changes))) {
      throw TariffProposalErrors.decided();
    }
    return this.require(tx, proposal.id);
  }

  record(tx: Transaction, auth: RequestAuth, proposal: TariffProposalRecord, what: string) {
    return this.audit.record(tx, auth, {
      action: `tariff_proposals.${what}`,
      targetType: 'tariff_proposal',
      targetId: proposal.id,
      targetLabel: proposal.name,
      after: {
        status: proposal.status,
        tariff_id: proposal.tariffId,
        comment: proposal.decisionComment || undefined,
      },
    });
  }
}
