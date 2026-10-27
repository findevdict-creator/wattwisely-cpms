import { Injectable } from '@nestjs/common';
import { SitePermissionChecker } from '../../../common/permissions/site-permission.checker';
import { RequestAuth } from '../../../common/request/request-auth';
import { ManagedServiceNotifier } from '../../managed/mail/managed-service.notifier';
import { TariffWriter } from '../tariff.writer';
import { CreateTariffProposalRequestDto } from './dto/create-tariff-proposal-request.dto';
import { ListTariffProposalsQueryDto } from './dto/list-tariff-proposals-query.dto';
import { TariffProposalDto } from './dto/tariff-proposal.dto';
import { TariffProposalStore } from './tariff-proposal.store';

/**
 * Proposing tariff changes (story MGT-03): a Managed operator whose agreement needs the
 * Owner's approval proposes new prices instead of saving them. The Owners get an e-mail
 * and decide in the portal. The proposer can withdraw while it is open.
 */
@Injectable()
export class TariffProposalsService {
  constructor(
    private readonly writer: TariffWriter,
    private readonly store: TariffProposalStore,
    private readonly notifier: ManagedServiceNotifier,
  ) {}

  async list(auth: RequestAuth, query: ListTariffProposalsQueryDto): Promise<TariffProposalDto[]> {
    const records = await this.writer.run(auth, (tx) => this.store.list(tx, query.status));
    return records.map((record) => new TariffProposalDto(record));
  }

  async get(auth: RequestAuth, id: string): Promise<TariffProposalDto> {
    return new TariffProposalDto(await this.writer.run(auth, (tx) => this.store.require(tx, id)));
  }

  async create(
    auth: RequestAuth,
    request: CreateTariffProposalRequestDto,
  ): Promise<TariffProposalDto> {
    SitePermissionChecker.requireWholeTenant(auth.requireAccess(), 'tariffs:write');
    TariffWriter.check(request.prices);
    const tenantId = auth.requireAccess().tenant.id;
    const { record, send } = await this.writer.run(auth, async (tx) => {
      const saved = await this.store.insert(tx, auth, request);
      await this.store.record(tx, auth, saved, 'proposed');
      const mail = await this.notifier.tariffProposed(tx, tenantId, {
        id: saved.id,
        name: saved.name,
      });
      return { record: saved, send: mail };
    });
    await send();
    return new TariffProposalDto(record);
  }

  async withdraw(auth: RequestAuth, id: string, version: number): Promise<TariffProposalDto> {
    SitePermissionChecker.requireWholeTenant(auth.requireAccess(), 'tariffs:write');
    const record = await this.writer.run(auth, async (tx) => {
      const proposal = await this.store.requireOpen(tx, id);
      const after = await this.store.close(tx, proposal, version, {
        status: 'withdrawn',
        decidedAt: new Date(),
      });
      await this.store.record(tx, auth, after, 'withdrawn');
      return after;
    });
    return new TariffProposalDto(record);
  }
}
