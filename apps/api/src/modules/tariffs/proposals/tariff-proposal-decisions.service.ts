import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { SitePermissionChecker } from '../../../common/permissions/site-permission.checker';
import { RequestAuth } from '../../../common/request/request-auth';
import { TariffPricesRequestDto } from '../dto/tariff-prices-request.dto';
import { TariffWriter } from '../tariff.writer';
import { DecideTariffProposalRequestDto } from './dto/decide-tariff-proposal-request.dto';
import { TariffProposalDto } from './dto/tariff-proposal.dto';
import { TariffProposalErrors } from './tariff-proposal-errors';
import { TariffProposalRecord } from './tariff-proposal-record';
import { TariffProposalStore } from './tariff-proposal.store';

/** A decision on a proposal: which one, the version the Owner saw, and their comment. */
export interface ProposalDecision {
  id: string;
  version: number;
  comment: string;
}

/**
 * The Owner's decision on a proposal (story MGT-03): approving applies the prices as the
 * Owner's own change (a new tariff or a new version, with the usual audit entries);
 * rejecting keeps the proposal with the comment, so the operator sees why.
 */
@Injectable()
export class TariffProposalDecisionsService {
  constructor(
    private readonly writer: TariffWriter,
    private readonly store: TariffProposalStore,
  ) {}

  approve(
    auth: RequestAuth,
    target: { id: string; version: number },
    request: DecideTariffProposalRequestDto,
  ) {
    const decision = { ...target, comment: request.comment?.trim() ?? '' };
    return this.decide(auth, decision, 'approved', (tx, proposal) =>
      this.apply(tx, auth, proposal),
    );
  }

  reject(
    auth: RequestAuth,
    target: { id: string; version: number },
    request: DecideTariffProposalRequestDto,
  ) {
    const comment = request.comment?.trim() ?? '';
    if (!comment) {
      throw TariffProposalErrors.commentRequired();
    }
    return this.decide(auth, { ...target, comment }, 'rejected', async () => null);
  }

  /** The proposed prices become the tariff's: a new tariff, or a new version of the one named. */
  private async apply(tx: Transaction, auth: RequestAuth, proposal: TariffProposalRecord) {
    const prices = proposal.prices as TariffPricesRequestDto;
    TariffWriter.check(prices);
    if (!proposal.tariffId) {
      return this.writer.create(tx, auth, {
        name: proposal.name,
        currency: proposal.currency,
        prices,
      });
    }
    const tariff = await this.store.requireTariff(tx, proposal.tariffId);
    await this.writer.addVersion(tx, auth, tariff, prices);
    return tariff.id;
  }

  private async decide(
    auth: RequestAuth,
    decision: ProposalDecision,
    status: 'approved' | 'rejected',
    apply: (tx: Transaction, proposal: TariffProposalRecord) => Promise<string | null>,
  ): Promise<TariffProposalDto> {
    SitePermissionChecker.requireWholeTenant(auth.requireAccess(), 'tariffs:approve');
    const record = await this.writer.run(auth, async (tx) => {
      const proposal = await this.store.requireOpen(tx, decision.id);
      const appliedTariffId = await apply(tx, proposal);
      const after = await this.store.close(tx, proposal, decision.version, {
        status,
        decidedBy: auth.requireAccount().id,
        decidedAt: new Date(),
        decisionComment: decision.comment,
        appliedTariffId,
      });
      await this.store.record(tx, auth, after, status);
      return after;
    });
    return new TariffProposalDto(record);
  }
}
