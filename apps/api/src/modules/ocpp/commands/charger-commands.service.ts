import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner, UuidV7 } from '@wattwisely/db';
import { CommandCatalog, StaffCommandAction } from '@wattwisely/ocpp-contracts';
import { PageRequest } from '../../../common/paging/page-request';
import { SitePermissionChecker } from '../../../common/permissions/site-permission.checker';
import { RequestAuth } from '../../../common/request/request-auth';
import { TenantAccess } from '../../../common/tenant/tenant-access';
import { ChargersService } from '../../assets/chargers/chargers.service';
import { OcppErrors } from '../ocpp-errors';
import { CommandRequest } from './command-request.builder';
import { CommandSender } from './command-sender';
import { CommandsRepository } from './commands.repository';
import { CommandDto } from './dto/command.dto';
import { CommandPageDto } from './dto/command-page.dto';
import { ListCommandsQueryDto } from './dto/list-commands-query.dto';

/**
 * Sends commands to chargers (OCPP gateway design, "Commands"). The API checks the
 * permission at the charger's site, writes the command row and the audit entry, and
 * hands the command to the gateway; the charger's answer arrives later.
 */
@Injectable()
export class ChargerCommandsService {
  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly chargers: ChargersService,
    private readonly commands: CommandsRepository,
    private readonly sender: CommandSender,
  ) {}

  /** 202 with the command; 409 charger_offline when the command cannot wait and the charger is away. */
  async send(
    auth: RequestAuth,
    chargerId: string,
    action: StaffCommandAction,
    body: CommandRequest,
  ): Promise<CommandDto> {
    const access = auth.requireAccess();
    const command = await this.transactionRunner.run(
      DatabaseSession.forTenant(access.tenant.id, auth.requireAccount().id),
      async (tx) => {
        const charger = await this.chargers.requireVisible(tx, access, chargerId);
        SitePermissionChecker.requireAt(access, 'chargers:command', charger.siteId);
        if (!charger.isOnline && !CommandCatalog.isQueueable(action)) {
          throw OcppErrors.chargerOffline();
        }
        return this.sender.queue(tx, auth, charger, { action, body });
      },
    );
    return new CommandDto(command);
  }

  async list(
    access: TenantAccess,
    chargerId: string,
    query: ListCommandsQueryDto,
  ): Promise<CommandPageDto> {
    const page = PageRequest.from(query);
    const records = await this.transactionRunner.run(
      DatabaseSession.forTenant(access.tenant.id),
      async (tx) => {
        const charger = await this.chargers.requireVisible(tx, access, chargerId);
        const filter = { chargerId: charger.id, actions: query.action, statuses: query.status };
        const rows = await this.commands.findPage(tx, filter, page.cursor, page.fetchSize);
        return Promise.all(rows.map((row) => this.commands.expireIfDue(tx, row)));
      },
    );
    const { items, nextCursor } = page.cut(records, (row) => row.createdAt.toISOString());
    return new CommandPageDto(
      items.map((row) => new CommandDto(row)),
      nextCursor,
    );
  }

  /** The command, or 404 when it does not exist or its charger lies outside the caller's scope. */
  async get(access: TenantAccess, id: string): Promise<CommandDto> {
    const record = await this.transactionRunner.run(
      DatabaseSession.forTenant(access.tenant.id),
      async (tx) => {
        const command = UuidV7.isUuid(id) ? await this.commands.findById(tx, id) : null;
        if (!command) {
          throw OcppErrors.commandNotFound();
        }
        await this.chargers.requireVisible(tx, access, command.chargerId);
        return this.commands.expireIfDue(tx, command);
      },
    );
    return new CommandDto(record);
  }
}
