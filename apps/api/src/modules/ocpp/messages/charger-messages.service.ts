import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { PageRequest } from '../../../common/paging/page-request';
import { TenantAccess } from '../../../common/tenant/tenant-access';
import { ChargersService } from '../../assets/chargers/chargers.service';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import { OcppMessageDto } from './dto/ocpp-message.dto';
import { OcppMessagePageDto } from './dto/ocpp-message-page.dto';
import { OcppMessagesRepository } from './ocpp-messages.repository';

/** Reads a charger's raw OCPP message log, within the caller's chargers:read scope. */
@Injectable()
export class ChargerMessagesService {
  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly chargers: ChargersService,
    private readonly messages: OcppMessagesRepository,
  ) {}

  async list(
    access: TenantAccess,
    chargerId: string,
    query: ListMessagesQueryDto,
  ): Promise<OcppMessagePageDto> {
    const page = PageRequest.from(query);
    const records = await this.transactionRunner.run(
      DatabaseSession.forTenant(access.tenant.id),
      async (tx) => {
        const charger = await this.chargers.requireVisible(tx, access, chargerId);
        const filter = {
          chargerId: charger.id,
          direction: query.direction,
          actions: query.action,
          isErrorsOnly: query.errors_only,
        };
        return this.messages.findPage(tx, filter, page.cursor, page.fetchSize);
      },
    );
    const { items, nextCursor } = page.cut(records, (row) => row.receivedAt.toISOString());
    return new OcppMessagePageDto(
      items.map((row) => new OcppMessageDto(row)),
      nextCursor,
    );
  }
}
